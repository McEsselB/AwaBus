const express = require('express')
const Bus     = require('../models/Bus')
const User    = require('../models/User')
const { protect } = require('../middleware/auth')
const { allow }   = require('../middleware/rbac')

const router = express.Router()

router.use(protect, allow('admin'))

// ── GET /api/buses ──
router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query

    const filter = {}
    if (status) filter.status = status
    if (search) {
      filter.$or = [
        { registrationNumber: { $regex: search, $options: 'i' } },
        { nickname:           { $regex: search, $options: 'i' } },
      ]
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit)
    const total = await Bus.countDocuments(filter)
    const buses = await Bus.find(filter)
      .populate('assignedDriverUserId', 'name phone status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    res.json({ buses, total, page: parseInt(page) })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/buses/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('assignedDriverUserId', 'name phone status')

    if (!bus) return res.status(404).json({ message: 'Bus not found.' })
    res.json({ bus })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/buses ──
router.post('/', async (req, res, next) => {
  try {
    const { registrationNumber, nickname, capacity, status } = req.body

    if (!registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required.' })
    }

    const bus = await Bus.create({
      registrationNumber: registrationNumber.trim().toUpperCase(),
      nickname: nickname?.trim() || null,
      capacity: capacity ? parseInt(capacity) : null,
      status: status || 'Idle',
    })

    res.status(201).json({ message: 'Bus created.', bus })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A bus with this registration number already exists.' })
    }
    next(err)
  }
})

// ── PUT /api/buses/:id ──
router.put('/:id', async (req, res, next) => {
  try {
    const { registrationNumber, nickname, capacity, status } = req.body

    const bus = await Bus.findById(req.params.id)
    if (!bus) return res.status(404).json({ message: 'Bus not found.' })

    // Cannot manually set status to Active Trip — that is set by the trip engine
    if (status === 'Active Trip') {
      return res.status(400).json({ message: 'Active Trip status is set by the system only.' })
    }

    if (registrationNumber) bus.registrationNumber = registrationNumber.trim().toUpperCase()
    if (nickname !== undefined) bus.nickname = nickname?.trim() || null
    if (capacity  !== undefined) bus.capacity = capacity ? parseInt(capacity) : null
    if (status)   bus.status = status

    await bus.save()
    res.json({ message: 'Bus updated.', bus })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Registration number already in use.' })
    }
    next(err)
  }
})

// ── PATCH /api/buses/:id/assign-driver ──
router.patch('/:id/assign-driver', async (req, res, next) => {
  try {
    const { driverUserId } = req.body
    const bus = await Bus.findById(req.params.id)
    if (!bus) return res.status(404).json({ message: 'Bus not found.' })

    // Unassign previous driver if there was one
    if (bus.assignedDriverUserId) {
      await User.findByIdAndUpdate(bus.assignedDriverUserId, { assignedBusId: null })
    }

    if (driverUserId) {
      // Validate the driver exists and is a driver role
      const driver = await User.findById(driverUserId)
      if (!driver || driver.role !== 'driver') {
        return res.status(400).json({ message: 'User not found or is not a driver.' })
      }
      if (driver.status !== 'active') {
        return res.status(400).json({ message: 'Cannot assign a suspended driver.' })
      }

      // Unassign driver from their previous bus if they had one
      if (driver.assignedBusId) {
        await Bus.findByIdAndUpdate(driver.assignedBusId, { assignedDriverUserId: null })
      }

      // Bidirectional assignment
      bus.assignedDriverUserId = driverUserId
      await bus.save()
      await User.findByIdAndUpdate(driverUserId, { assignedBusId: bus._id })
    } else {
      // Remove assignment
      bus.assignedDriverUserId = null
      await bus.save()
    }

    const updated = await Bus.findById(bus._id)
      .populate('assignedDriverUserId', 'name phone status')

    res.json({ message: 'Driver assignment updated.', bus: updated })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/buses/:id ──
router.delete('/:id', async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id)
    if (!bus) return res.status(404).json({ message: 'Bus not found.' })

    if (bus.status === 'Active Trip') {
      return res.status(400).json({ message: 'Cannot delete a bus on an active trip.' })
    }

    if (bus.assignedDriverUserId) {
      return res.status(400).json({
        message: 'Unassign the driver before deleting this bus.',
      })
    }

    await bus.deleteOne()
    res.json({ message: 'Bus deleted.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router