const jwt  = require('jsonwebtoken')
const User = require('../models/User.js')

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Please sign in.' })
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-passwordHash -ivrPinHash')
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is suspended or deleted.' })
    }

    // Invalidate tokens issued before password change
    if (user.passwordChangedAt) {
      const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000)
      if (decoded.iat < changedAt) {
        return res.status(401).json({ message: 'Password was recently changed. Please sign in again.' })
      }
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' })
    }
    return res.status(401).json({ message: 'Invalid token.' })
  }
}

module.exports = { protect }