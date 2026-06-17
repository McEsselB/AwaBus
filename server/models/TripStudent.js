const mongoose = require('mongoose')

const TripStudentSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  attending: {
    type: Boolean,
    default: true,
  },
  // Write-once — NEVER set back to false once true
  alertTriggered: {
    type: Boolean,
    default: false,
  },
  alertTimestamp: {
    type: Date,
    default: null,
  },
  manuallyResolved: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true })

// Compound index for geofence engine queries
TripStudentSchema.index({ tripId: 1, attending: 1, alertTriggered: 1 })

module.exports = mongoose.model('TripStudent', TripStudentSchema)