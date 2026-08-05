const express     = require('express')
const rateLimit   = require('express-rate-limit')
const User        = require('../models/User.js')
const { signToken } = require('../utils/jwt.js')
const { protect }   = require('../middleware/auth.js')
const { allow }     = require('../middleware/rbac.js')

const router = express.Router()

// Strict rate limit on login — 10 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ── POST /api/auth/login ──
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password are required.' })
    }

    const user = await User.findOne({ phone: phone.trim() })

    // Only admins and drivers can log into the web portal
    if (!user || !['admin', 'driver'].includes(user.role)) {
      return res.status(401).json({ message: 'Invalid phone or password.' })
    }

    if (user.status === 'suspended') {
      return res.status(401).json({ message: 'Account suspended. Contact your administrator.' })
    }

    if (user.status === 'deleted') {
      return res.status(401).json({ message: 'Invalid phone or password.' })
    }

    // Lockout check
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const mins = Math.ceil((user.lockoutUntil - new Date()) / 60000)
      return res.status(401).json({ message: `Account locked. Try again in ${mins} minute(s).` })
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      user.loginAttempts += 1
      if (user.loginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000)
        user.loginAttempts = 0
      }
      await user.save({ validateBeforeSave: false })
      return res.status(401).json({ message: 'Invalid phone or password.' })
    }

    // Reset on success
    user.loginAttempts = 0
    user.lockoutUntil  = null
    await user.save({ validateBeforeSave: false })

    const token = signToken(user._id)

    res.json({
      token,
      user: user.toJSON(),
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/register ── (admin only)
router.post('/register', protect, allow('admin'), async (req, res, next) => {
  try {
    const { name, phone, role, password, ivrPin, status } = req.body

    if (!name || !phone || !role) {
      return res.status(400).json({ message: 'Name, phone, and role are required.' })
    }

    if (['admin', 'driver'].includes(role) && !password) {
      return res.status(400).json({ message: 'Password is required for admin and driver accounts.' })
    }

    if (role === 'parent' && !ivrPin) {
      return res.status(400).json({ message: 'IVR PIN is required for parent accounts.' })
    }

    if (ivrPin && !/^\d{4}$/.test(ivrPin)) {
      return res.status(400).json({ message: 'IVR PIN must be exactly 4 digits.' })
    }

    const existing = await User.findOne({ phone: phone.trim() })
    if (existing) {
      return res.status(409).json({ message: 'A user with this phone number already exists.' })
    }

    const user = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      role,
      status: status || 'active',
      passwordHash: password || undefined,
      ivrPinHash:   ivrPin   || undefined,
      mustChangePassword: true,
    })

    res.status(201).json({ message: 'User created.', user: user.toJSON() })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Phone number already registered.' })
    }
    next(err)
  }
})

// ── GET /api/auth/me ── (verify token + get current user)
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router