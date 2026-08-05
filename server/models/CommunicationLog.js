const mongoose = require('mongoose')

const CommunicationLogSchema = new mongoose.Schema({
  tripStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TripStudent', default: null },
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student',     default: null },
  driverId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',        default: null },
  parentUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',        default: null },
  type: {
    type: String,
    enum: ['proximity_alert', 'sms_fallback', 'ivr_cancellation', 'ivr_bridge', 'delay_broadcast'],
    required: true,
  },
  channel: {
    type: String,
    enum: ['voice', 'sms', 'ivr'],
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    default: 'sent',
  },
  recipientPhone:     String,
  arkeselResponseCode: String,
  retryCount:         { type: Number, default: 0 },
  failureReason:      String,
  arkeselCallId:      String,
  arkeselSessionId:   String,
  timestamp:          { type: Date, default: Date.now },
})

// Append-only — never updated or deleted
CommunicationLogSchema.index({ timestamp: -1 })
CommunicationLogSchema.index({ type: 1, status: 1 })

module.exports = mongoose.model('CommunicationLog', CommunicationLogSchema)