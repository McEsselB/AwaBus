const express  = require('express')
const Student  = require('../models/Student')
const User     = require('../models/User')
const { protect } = require('../middleware/auth')
const { allow }   = require('../middleware/rbac')

const router = express.Router()

router.use(protect, allow('admin'))

// ── GET /api/students ──
router.get('/', async (req, res, next) => {
  try {
    const { search, driverUserId, active, page = 1, limit = 50 } = req.query

    const filter = {}
    if (active !== undefined) filter.active = active === 'true'
    if (driverUserId) filter.driverUserId = driverUserId
    if (search) {
      filter.name = { $regex: search, $options: 'i' }
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit)
    const total = await Student.countDocuments(filter)
    const students = await Student.find(filter)
      .populate('parentUserId', 'name phone')
      .populate('driverUserId', 'name phone')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))

    res.json({ students, total, page: parseInt(page) })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/students/:id ──
router.get('/:id', async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('parentUserId', 'name phone')
      .populate('driverUserId', 'name phone')

    if (!student) return res.status(404).json({ message: 'Student not found.' })
    res.json({ student })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/students ──
router.post('/', async (req, res, next) => {
  try {
    const {
      name, parentUserId, driverUserId,
      homeLatitude, homeLongitude, geofenceRadius,
    } = req.body

    // Required field validation
    if (!name || !parentUserId || !driverUserId || homeLatitude == null || homeLongitude == null) {
      return res.status(400).json({
        message: 'Name, parent, driver, and home coordinates are required.',
      })
    }

    // Validate parent exists and is a parent
    const parent = await User.findById(parentUserId)
    if (!parent || parent.role !== 'parent') {
      return res.status(400).json({ message: 'Invalid parent — user not found or not a parent.' })
    }

    // Validate driver exists and is a driver
    const driver = await User.findById(driverUserId)
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({ message: 'Invalid driver — user not found or not a driver.' })
    }

    const lat = parseFloat(homeLatitude)
    const lng = parseFloat(homeLongitude)

    if (isNaN(lat) || lat < -90  || lat > 90) {
      return res.status(400).json({ message: 'Latitude must be between -90 and 90.' })
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Longitude must be between -180 and 180.' })
    }

    const radius = geofenceRadius ? parseInt(geofenceRadius) : 500
    if (radius < 100 || radius > 2000) {
      return res.status(400).json({ message: 'Geofence radius must be between 100m and 2000m.' })
    }

    const student = await Student.create({
      name:           name.trim(),
      parentUserId,
      driverUserId,
      homeLatitude:   lat,
      homeLongitude:  lng,
      geofenceRadius: radius,
    })

    const populated = await Student.findById(student._id)
      .populate('parentUserId', 'name phone')
      .populate('driverUserId', 'name phone')

    res.status(201).json({ message: 'Student created.', student: populated })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/students/:id ──
router.put('/:id', async (req, res, next) => {
  try {
    const {
      name, parentUserId, driverUserId,
      homeLatitude, homeLongitude, geofenceRadius, active,
    } = req.body

    const student = await Student.findById(req.params.id)
    if (!student) return res.status(404).json({ message: 'Student not found.' })

    if (name) student.name = name.trim()
    if (active !== undefined) student.active = active

    if (parentUserId) {
      const parent = await User.findById(parentUserId)
      if (!parent || parent.role !== 'parent') {
        return res.status(400).json({ message: 'Invalid parent.' })
      }
      student.parentUserId = parentUserId
    }

    if (driverUserId) {
      const driver = await User.findById(driverUserId)
      if (!driver || driver.role !== 'driver') {
        return res.status(400).json({ message: 'Invalid driver.' })
      }
      student.driverUserId = driverUserId
    }

    if (homeLatitude != null) {
      const lat = parseFloat(homeLatitude)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ message: 'Invalid latitude.' })
      }
      student.homeLatitude = lat
    }

    if (homeLongitude != null) {
      const lng = parseFloat(homeLongitude)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ message: 'Invalid longitude.' })
      }
      student.homeLongitude = lng
    }

    if (geofenceRadius != null) {
      const radius = parseInt(geofenceRadius)
      if (radius < 100 || radius > 2000) {
        return res.status(400).json({ message: 'Geofence radius must be between 100m and 2000m.' })
      }
      student.geofenceRadius = radius
    }

    await student.save()

    const populated = await Student.findById(student._id)
      .populate('parentUserId', 'name phone')
      .populate('driverUserId', 'name phone')

    res.json({ message: 'Student updated.', student: populated })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/students/:id ──
router.delete('/:id', async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
    if (!student) return res.status(404).json({ message: 'Student not found.' })

    // Soft delete — keeps history intact for trip records
    student.active = false
    await student.save()

    res.json({ message: 'Student removed.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router