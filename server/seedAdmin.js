#!/usr/bin/env node
/**
 * seedAdmin.js
 * Creates an admin account if one with the given phone doesn't already exist.
 *
 * Usage:
 *   MONGO_URI=mongodb://localhost:27017/yourdb node seedAdmin.js
 *
 * Or with a .env file (requires dotenv):
 *   node -r dotenv/config seedAdmin.js
 */

'use strict'

const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

// ─── Inline User Schema (mirrors your model exactly) ──────────────────────────
const UserSchema = new mongoose.Schema(
  {
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
      match: [/^\+\d{7,15}$/, 'Phone must be in E.164 format e.g. +233201234567'],
    },
    passwordHash: { type: String },
    ivrPinHash:   { type: String },
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
    mustChangePassword: { type: Boolean, default: true },
    assignedBusId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    loginAttempts:      { type: Number, default: 0 },
    lockoutUntil:       { type: Date,   default: null },
    passwordChangedAt:  Date,
  },
  { timestamps: true }
)

UserSchema.index({ role: 1 })
UserSchema.index({ status: 1 })

UserSchema.pre('save', async function () {
  if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12)
  }
  if (this.isModified('ivrPinHash') && this.ivrPinHash && !this.ivrPinHash.startsWith('$2')) {
    this.ivrPinHash = await bcrypt.hash(this.ivrPinHash, 10)
  }
})

const User = mongoose.models.User || mongoose.model('User', UserSchema)

// ─── Admin seed data ───────────────────────────────────────────────────────────
const ADMIN = {
  name:               'Dave',
  phone:              '+233557625112',
  passwordHash:       '123456',   // will be hashed by the pre-save hook
  role:               'admin',
  status:             'active',
  mustChangePassword: false,      // set to true if you want Dave to change it on first login
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seed () {
  const uri = 'mongodb+srv://niiayilaryea5000_db_user:FkYIVxn8Otk3TcMX@cluster0.kss5j5t.mongodb.net/?appName=Cluster0' // 🔧 Replace with your actual MongoDB URI

  console.log('⏳  Connecting to MongoDB …')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8_000 })
  console.log('✅  Connected.')

  try {
    const existing = await User.findOne({ phone: ADMIN.phone })

    if (existing) {
      console.log(`ℹ️   Admin with phone ${ADMIN.phone} already exists (id: ${existing._id}). No changes made.`)
      return
    }

    const admin = new User(ADMIN)
    await admin.save()

    console.log('🎉  Admin account created successfully!')
    console.log(`    Name  : ${ADMIN.name}`)
    console.log(`    Phone : ${ADMIN.phone}`)
    console.log(`    Role  : ${ADMIN.role}`)
    console.log(`    ID    : ${admin._id}`)
  } finally {
    await mongoose.disconnect()
    console.log('🔌  Disconnected.')
  }
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message)
  process.exit(1)
})