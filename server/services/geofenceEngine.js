const haversine    = require('../utils/haversine')
const TripStudent  = require('../models/TripStudent')
const Student      = require('../models/Student')
const CommunicationLog = require('../models/CommunicationLog')
const User         = require('../models/User')

/**
 * Called on every GPS ping.
 * Checks all attending, un-alerted students on this trip.
 * If the bus is within a student's geofence radius, fires the alert.
 */
async function runGeofenceCheck(tripId, driverId, busLat, busLng) {
  // Fetch all attending students whose alert has not yet fired
  const tripStudents = await TripStudent.find({
    tripId,
    attending:      true,
    alertTriggered: false,
  }).populate({
    path: 'studentId',
    populate: { path: 'parentUserId', select: 'name phone' },
  })

  if (!tripStudents.length) return

  const triggered = []

  for (const ts of tripStudents) {
    const student = ts.studentId
    if (!student?.homeLatitude || !student?.homeLongitude) continue

    const distance = haversine(
      busLat, busLng,
      student.homeLatitude,
      student.homeLongitude
    )

    const radius = student.geofenceRadius ?? 500

    // Inclusive boundary — exactly at radius triggers alert
    if (distance <= radius) {
      triggered.push({ ts, student, distance })
    }
  }

  if (!triggered.length) return

  // Fire alerts concurrently
  await Promise.allSettled(
    triggered.map(({ ts, student }) => fireAlert(ts, student, driverId))
  )
}

async function fireAlert(tripStudent, student, driverId) {
  try {
    // Write-once: mark alert triggered
    await TripStudent.findByIdAndUpdate(tripStudent._id, {
      alertTriggered: true,
      alertTimestamp: new Date(),
    })

    const parent = student.parentUserId
    if (!parent?.phone) {
      console.warn(`[Geofence] No parent phone for student ${student.name}`)
      return
    }

    console.log(`[Geofence] 🔔 Alert fired for ${student.name} — parent: ${parent.phone}`)

    // Log the communication attempt
    await CommunicationLog.create({
      tripStudentId: tripStudent._id,
      studentId:     student._id,
      driverId,
      parentUserId:  parent._id,
      type:          'proximity_alert',
      channel:       'voice',
      status:        'sent',
      recipientPhone: parent.phone,
      timestamp:     new Date(),
    })

    // TODO: plug in Arkesel voice call here
    // await communicationEngine.makeVoiceCall(parent.phone, student.name)

  } catch (err) {
    console.error(`[Geofence] Alert failed for student ${student?._id}:`, err.message)
  }
}

module.exports = { runGeofenceCheck }