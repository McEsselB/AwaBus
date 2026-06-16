require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const authRoutes    = require('./routes/auth.js')
const userRoutes    = require('./routes/users.js')
// const busRoutes     = require('./routes/buses')
// const studentRoutes = require('./routes/students')

const app = express()

// ── Security & parsing ──
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_WEB_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// ── Logging (dev only) ──
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ── Routes ──
app.use('/api/auth',     authRoutes)
app.use('/api/users',    userRoutes)
// app.use('/api/buses',    busRoutes)
// app.use('/api/students', studentRoutes)

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
})

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
})

module.exports = app