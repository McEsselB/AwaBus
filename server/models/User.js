const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    unique: true,
    trim: true,
    // E.164 format: +233XXXXXXXXX
    match: [/^\+\d{7,15}$/, 'Phone must be in E.164 format e.g. +233201234567'],
  },
  passwordHash: {
    type: String,
    // Required for admin and driver, not for parent (they use IVR PIN)
  },
  ivrPinHash: {
    type: String,
    // Required for parents only
  },
  role: {
    type: String,
    enum: ['admin', 'driver', 'parent'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },
  mustChangePassword: {
    type: Boolean,
    default: true,
  },
  assignedBusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    default: null,
  },
  loginAttempts: { type: Number, default: 0 },
  lockoutUntil:  { type: Date, default: null },
  passwordChangedAt: Date,
}, { timestamps: true })

// ── Indexes ──
UserSchema.index({ role: 1 })
UserSchema.index({ status: 1 })

// ── Hash password before save ──
UserSchema.pre('save', async function () {
  if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12)
  }
  if (this.isModified('ivrPinHash') && this.ivrPinHash && !this.ivrPinHash.startsWith('$2')) {
    this.ivrPinHash = await bcrypt.hash(this.ivrPinHash, 10)
  }
})

// ── Instance methods ──
UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

UserSchema.methods.comparePin = function (plain) {
  return bcrypt.compare(plain, this.ivrPinHash)
}

// ── Never return hashes ──
UserSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.ivrPinHash
  delete obj.loginAttempts
  delete obj.lockoutUntil
  return obj
}

module.exports = mongoose.model('User', UserSchema)