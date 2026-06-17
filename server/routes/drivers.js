const express = require('express')
const Bus        = require('../models/Bus')
const Student    = require('../models/Student')
const Trip       = require('../models/Trip')
const TripStudent = require('../models/TripStudent')
const { protect } = require('../middleware/auth')
const { allow }   = require('../middleware/rbac')

const router = express.Router()

// All driver routes require an authenticated driver
router.use(protect, allow('driver'))

// ── GET /api/drivers/me/route ──────────────────────────────────────────────
// Returns the driver's assigned bus and their active students.
// This is the payload the dashboard renders on load.
router.get('/me/route', async (req, res, next) => {
  try {
    const driverId = req.user._id

    // Find the bus assigned to this driver
    const bus = await Bus.findOne({ assignedDriverUserId: driverId })

    // Find all active students assigned to this driver
    const students = await Student.find({
      driverUserId: driverId,
      active: true,
    }).select('name homeLatitude homeLongitude geofenceRadius parentUserId')

    res.json({
      bus: bus ?? null,
      students,
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/trips/start ──────────────────────────────────────────────────
// Creates a new active Trip, bulk-creates TripStudent records for every
// active student, and flips the bus status to 'Active Trip'.
//
// Body: { busId: string }
router.post('/trips/start', async (req, res, next) => {
  try {
    const driverId = req.user._id
    const { busId } = req.body

    if (!busId) {
      return res.status(400).json({ message: 'busId is required.' })
    }

    // Verify the bus exists and belongs to this driver
    const bus = await Bus.findOne({
      _id: busId,
      assignedDriverUserId: driverId,
    })
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found or not assigned to you.' })
    }

    // Prevent double-starting
    if (bus.status === 'Active Trip') {
      return res.status(409).json({ message: 'A trip is already active for this bus.' })
    }

    // Fetch active students for this driver
    const students = await Student.find({
      driverUserId: driverId,
      active: true,
    }).select('_id')

    if (!students.length) {
      return res.status(400).json({ message: 'No active students on your route.' })
    }

    // Create the trip
    const trip = await Trip.create({
      driverUserId: driverId,
      busId: bus._id,
      status: 'Active',
      startTime: new Date(),
    })

    // Bulk-create one TripStudent record per student
    await TripStudent.insertMany(
      students.map((s) => ({
        tripId: trip._id,
        studentId: s._id,
        attending: true,
        alertTriggered: false,
      }))
    )

    // Mark the bus as on an active trip
    bus.status = 'Active Trip'
    await bus.save()

    res.status(201).json({
      message: 'Trip started.',
      trip,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router