const mongoose = require('mongoose')

const TripSchema = new mongoose.Schema({
  driverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['Active', 'Completed'],
    default: 'Active',
    index: true,
  },
  delayBroadcastLog: [
    {
      timestamp:      { type: Date, default: Date.now },
      delayMinutes:   Number,
      recipientCount: Number,
    }
  ],
}, { timestamps: true })

module.exports = mongoose.model('Trip', TripSchema)