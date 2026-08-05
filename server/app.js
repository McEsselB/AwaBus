<<<<<<< HEAD
const express = require("express");
const cors = require("cors");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "awabus-backend",
  });
});

module.exports = app;
=======
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const authRoutes    = require('./routes/auth.js')
const userRoutes    = require('./routes/users.js')
const busRoutes     = require('./routes/buses')
const studentRoutes = require('./routes/students')
const driverRoutes  = require('./routes/drivers.js')
const tripRoutes    = require('./routes/trips.js')

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
app.use('/api/buses',    busRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/trips', tripRoutes)

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
>>>>>>> c3f73c88e0f06d54afdb7f3176273dfe0743e305
