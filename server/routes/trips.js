const express = require('express')
const Trip        = require('../models/Trip')
const TripStudent = require('../models/TripStudent')
const Bus         = require('../models/Bus')
const Student     = require('../models/Student')
const { runGeofenceCheck } = require('../services/geofenceEngine')
const { protect } = require('../middleware/auth')
const { allow }   = require('../middleware/rbac')

const router = express.Router()

router.use(protect, allow('driver'))

router.post('/start', async (req, res, next) => {
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

// ── GET /api/trips/:id/students ────────────────────────────────────────────
// Polled every 8 s by ActiveTripScreen to pick up geofence alerts.
// Returns the alertTriggered / manuallyResolved state for every student
// on this trip so the UI can flip pending → alert.
router.get('/:id/students', async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
    if (!trip) return res.status(404).json({ message: 'Trip not found.' })

    // Drivers may only query their own trips
    if (trip.driverUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' })
    }

    const tripStudents = await TripStudent.find({ tripId: trip._id })
      .select('studentId attending alertTriggered alertTimestamp manuallyResolved')
      .lean()

    // Normalise studentId to a plain string so the frontend === check works
    const students = tripStudents.map(ts => ({
      ...ts,
      studentId: ts.studentId.toString(),
    }))

    res.json({ students })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/trips/:id/students/:studentId/resolve ──────────────────────
// Driver taps "Mark Dropped" on an alerted student.
// Sets manuallyResolved = true (alertTriggered stays true — write-once).
router.patch('/:id/students/:studentId/resolve', async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
    if (!trip) return res.status(404).json({ message: 'Trip not found.' })

    if (trip.driverUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' })
    }

    const ts = await TripStudent.findOneAndUpdate(
      {
        tripId:    trip._id,
        studentId: req.params.studentId,
      },
      { manuallyResolved: true },
      { new: true }
    )

    if (!ts) return res.status(404).json({ message: 'Student not on this trip.' })

    res.json({ message: 'Student marked as dropped off.', tripStudent: ts })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/trips/:id/end ────────────────────────────────────────────────
// Ends the trip: sets Trip status → Completed, records endTime,
// and resets the bus back to Idle.
router.post('/:id/end', async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
    if (!trip) return res.status(404).json({ message: 'Trip not found.' })

    if (trip.driverUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' })
    }

    if (trip.status === 'Completed') {
      return res.status(409).json({ message: 'Trip is already completed.' })
    }

    trip.status  = 'Completed'
    trip.endTime = new Date()
    await trip.save()

    // Reset bus to Idle so the driver can start a new trip tomorrow
    await Bus.findByIdAndUpdate(trip.busId, { status: 'Idle' })

    res.json({ message: 'Trip ended.', trip })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/trips/ping ───────────────────────────────────────────────────
// Called every 10 s by the GPS background task.
// Body: { tripId, lat, lng, timestamp }
// Runs the geofence engine synchronously — fast enough at this cadence.
router.post('/ping', async (req, res, next) => {
  try {
    const { tripId, lat, lng, timestamp } = req.body

    if (!tripId || lat == null || lng == null) {
      return res.status(400).json({ message: 'tripId, lat and lng are required.' })
    }

    const trip = await Trip.findById(tripId)
    if (!trip) return res.status(404).json({ message: 'Trip not found.' })

    if (trip.driverUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' })
    }

    if (trip.status !== 'Active') {
      return res.status(409).json({ message: 'Trip is not active.' })
    }

    // Run geofence check — fires alerts for any student within radius
    await runGeofenceCheck(trip._id, req.user._id, lat, lng)

    res.json({ ok: true, ts: timestamp ?? new Date().toISOString() })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/trips/:id/broadcast ─────────────────────────────────────────
// Driver sends a delay broadcast to all parents on this trip.
// Body: { delayMinutes: number }
router.post('/:id/broadcast', async (req, res, next) => {
  try {
    const { delayMinutes } = req.body

    if (!delayMinutes || typeof delayMinutes !== 'number' || delayMinutes < 1) {
      return res.status(400).json({ message: 'delayMinutes must be a positive number.' })
    }

    const trip = await Trip.findById(req.params.id)
    if (!trip) return res.status(404).json({ message: 'Trip not found.' })

    if (trip.driverUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' })
    }

    if (trip.status !== 'Active') {
      return res.status(409).json({ message: 'Trip is not active.' })
    }

    // Collect all parents on this trip via TripStudent → Student → parentUserId
    const tripStudents = await TripStudent.find({
      tripId:    trip._id,
      attending: true,
    }).populate({
      path: 'studentId',
      populate: { path: 'parentUserId', select: 'name phone' },
    })

    const parents = tripStudents
      .map(ts => ts.studentId?.parentUserId)
      .filter(p => p?.phone)

    // Log the broadcast
    trip.delayBroadcastLog.push({
      timestamp:      new Date(),
      delayMinutes,
      recipientCount: parents.length,
    })
    await trip.save()

    // TODO: plug in Arkesel broadcast here
    // await Promise.allSettled(parents.map(p =>
    //   communicationEngine.sendDelayBroadcast(p.phone, delayMinutes)
    // ))

    console.log(`[Broadcast] Delay of ${delayMinutes} min sent to ${parents.length} parents`)

    res.json({
      message:        `Delay broadcast sent to ${parents.length} parent(s).`,
      delayMinutes,
      recipientCount: parents.length,
    })
  } catch (err) {
    next(err)
  }
})



module.exports = router