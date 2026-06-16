const express = require('express')
const User    = require('../models/User')
const Bus     = require('../models/Bus.js')
const { protect } = require('../middleware/auth')
const { allow }   = require('../middleware/rbac')

const router = express.Router()

// All user routes require admin
router.use(protect, allow('admin'))

// ── GET /api/users ──
router.get('/', async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query

    const filter = {}
    if (role)   filter.role   = role
    if (status) filter.status = status
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit)
    const total = await User.countDocuments(filter)
    const users = await User.find(filter)
      .select('-passwordHash -ivrPinHash')
      .populate('assignedBusId', 'registrationNumber nickname')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    res.json({ users, total, page: parseInt(page) })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/users/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -ivrPinHash')
      .populate('assignedBusId', 'registrationNumber nickname')

    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/users/:id ──
router.put('/:id', async (req, res, next) => {
  try {
    const { name, phone, role, status } = req.body

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (name)   user.name   = name.trim()
    if (phone)  user.phone  = phone.trim()
    if (role)   user.role   = role
    if (status) user.status = status

    await user.save()
    res.json({ message: 'User updated.', user: user.toJSON() })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Phone number already in use.' })
    }
    next(err)
  }
})

// ── PATCH /api/users/:id/status ──
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or suspended.' })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-passwordHash -ivrPinHash')

    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ message: `User ${status}.`, user })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/users/:id ──
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' })
    }

    // Soft delete — preserve history
    user.status = 'deleted'
    await user.save({ validateBeforeSave: false })

    // Unassign from bus if driver
    if (user.assignedBusId) {
      await Bus.findByIdAndUpdate(user.assignedBusId, { assignedDriverUserId: null })
    }

    res.json({ message: 'User deleted.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router