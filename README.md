# 🚌 AwaBus

> **Geofence-Triggered Automated Proximity Alert and Communication System for School Transport in Ghana**

A school bus proximity alert system purpose-built for the Ghanaian school transport ecosystem. When a school bus enters a configurable radius around a child's drop-off point, AwaBus automatically triggers a voice call (robocall) to the parent — no smartphone, no data connection, no app required on the parent's end.

The system is built around three components: a **React Native Driver Android App**, a **React.js Admin Web Portal**, and an **Arkesel IVR telephony channel** as the exclusive parent interface. Parents on any phone — basic or smart — are fully served by the IVR dial-in channel for both inbound actions and outbound alerts.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Deployment](#deployment)
- [Team](#team)

---

## Overview

AwaBus addresses a safety-critical gap in Ghanaian school transport: no structured, automated communication exists between school bus drivers and parents. Children are left waiting unsupervised at drop-off points while drivers make manual calls from moving vehicles.

**AwaBus automates the entire pipeline:**

1. Driver opens the Android app and initiates a trip with one tap
2. The app streams GPS coordinates to the backend every 10 seconds via a background foreground service
3. The backend runs a Haversine geofence check against every active student's drop-off coordinates on each GPS ping
4. When the bus enters the configured radius, an automated voice call fires to the parent (or secondary receiver) via Arkesel
5. If the call fails, an SMS fallback is dispatched immediately; if that fails, Hubtel is used as a second-level fallback
6. Parents manage attendance and connect to drivers exclusively via the **Arkesel IVR inbound channel** — a single phone call, no smartphone required
7. Admins configure the entire system — users, buses, students, geofence coordinates — through the **Admin Web Portal**

> **Scope Note:** This architecture removes the parent mobile app (React Native) and parent PWA in favour of the IVR telephony channel as the sole parent interface. The Admin Portal and Driver App are unchanged in scope.

---

## Key Features

### 🗺️ Geofence Engine (Backend)
- Haversine formula computed server-side on every GPS ping — no external mapping library
- Per-student configurable geofence radius (100m–2000m; default 500m)
- Inclusive boundary trigger: student exactly at the radius boundary receives an alert
- One-time alert trigger per student per trip (write-once `alertTriggered` flag, never reversed)
- Secondary receiver logic: if an active secondary receiver is set for a parent, the voice call routes to them instead; SMS confirmation goes to the primary parent

### 🚗 Driver Android App
- Background GPS foreground service (`expo-task-manager`) that streams continuously even when the phone is locked or the app is minimised
- Dynamic student attendance checklist per active trip (Pending / Alert Sent / Dropped Off)
- One-tap trip initiation and completion with pre/post-trip confirmation prompts
- Live GPS status display: current coordinates, last ping timestamp, connectivity indicator
- Offline ping queue: up to 60 pings (10 minutes) cached locally and replayed in order on reconnect
- Delay broadcast: notify all attending parents on the route via SMS with a single tap

### 🖥️ Admin Web Portal
- Full CRUD: Users (Admins, Drivers, Parents), Buses, Students
- Student Geospatial Mapping: Leaflet.js interactive map with drag-and-drop pin placement, geofence circle overlay, per-driver colour filtering
- Driver–Bus assignment with bidirectional reference updates
- Activity & Communication Log: paginated, filterable audit trail of every system event (voice calls, SMS, IVR interactions)
- Real-time Socket.io updates: live log entries and critical failure alerts

### 📞 IVR Inbound Channel (Exclusive Parent Interface)
- Dedicated school dial-in number powered by Arkesel
- Caller ID recognition: registered parents are greeted by ward name automatically
- Unrecognised numbers prompted to enter their registered phone number and 4-digit PIN
- **Press 1** → cancel ward's bus seat for today (blocked after 06:30 AM Ghana Standard Time)
- **Press 2** → bridge call directly to the driver; automatic fallback message if driver unreachable within 30 seconds
- Multi-student support: parents with multiple wards on different routes are prompted to select a student first
- PIN security: bcrypt-hashed 4-digit PIN; maximum 3 attempts per IVR session before disconnection
- All webhook events validated via `X-Arkesel-Signature` shared secret

### 📣 Outbound Voice & SMS
- Arkesel Voice API for proximity alerts with automatic Arkesel SMS fallback
- Hubtel SMS as second-level fallback if Arkesel SMS fails
- Delay broadcast to all attending parents with deduplication (parent with multiple children on the same route receives one message, not two)
- `Promise.allSettled` async dispatch — driver's request returns immediately with a queued confirmation

---

## System Architecture

```
┌──────────────────────┐    GPS Pings (REST)      ┌──────────────────────────────────────┐
│  Driver Android App   │ ────────────────────────▶│                                      │
│  (React Native/Expo)  │                          │      Node.js / Express.js            │
└──────────────────────┘                          │          Backend API                  │
                                                  │                                      │
┌──────────────────────┐    REST + WebSocket       │   ┌──────────────────────────────┐  │
│   Admin Web Portal    │ ◀──────────────────────▶ │   │      Geofence Engine         │  │
│   (React.js / Vite)   │                          │   │      (Haversine calc)        │  │
└──────────────────────┘                          │   └──────────────┬───────────────┘  │
                                                  │                  │                   │
                                                  │                  ▼                   │
                                                  │   ┌──────────────────────────────┐  │
                                                  │   │    Communication Engine      │  │
                                                  │   │  Voice → SMS → Hubtel        │  │
                                                  │   └──────────────┬───────────────┘  │
                                                  │                  │                   │
                                                  │                  ▼                   │
                                                  │   ┌──────────────────────────────┐  │
                                                  │   │     IVR Webhook Handler      │  │
                                                  │   │  /inbound · /dtmf · /callback│  │
                                                  │   └──────────────────────────────┘  │
                                                  │                                      │
┌──────────────────────┐    Webhook (IVR events)  └──────────────────┬───────────────────┘
│   Arkesel IVR         │ ────────────────────────▶                  │
│ (Inbound calls)       │                                             ▼
└──────────────────────┘                          ┌──────────────────────────────────────┐
                                                  │           MongoDB Atlas               │
┌──────────────────────┐    API Calls             │          (Mongoose ODM)               │
│   Arkesel API         │ ◀──────────────────────  └──────────────────────────────────────┘
│ (Voice / SMS / IVR)   │
└──────────────────────┘

┌──────────────────────┐    SMS Fallback
│   Hubtel API          │ ◀──────────────────────
│ (SMS second-level)    │
└──────────────────────┘

         ┌──────────────────────────────────────────────────────────────────┐
         │                  Parent Interface — IVR Only                      │
         │  Parents have NO app and NO web interface. They interact with     │
         │  AwaBus exclusively through outbound voice calls and SMS (system  │
         │  → parent) and inbound IVR calls (parent → system). Any phone     │
         │  — basic or smart — is fully supported.                           │
         └──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Driver Mobile App | React Native (Expo), `expo-location`, `expo-task-manager` |
| Admin Web Portal | React.js (Vite) |
| Backend API | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Real-time | Socket.io (driver app + admin portal only) |
| Map (Admin) | Leaflet.js + OpenStreetMap (no paid APIs) |
| Communication | Arkesel API (Voice Call, SMS, IVR); Hubtel (SMS second-level fallback) |
| Geofence Logic | Haversine formula (pure Node.js) |
| Authentication | JWT (stateless), bcrypt (passwords + IVR PINs) |
| Rate Limiting | express-rate-limit |
| Testing | Jest, Supertest |
| Hosting | Railway (backend), Vercel (admin portal), Expo EAS (driver app), MongoDB Atlas (DB) |
| Design | Figma |
| Version Control | Git, GitHub |

---

## Project Structure

```
awabus/
├── server/                         # Node.js / Express backend
│   ├── config/
│   │   ├── db.js                   # MongoDB connection
│   │   └── arkesel.js              # Arkesel API config
│   ├── models/
│   │   ├── User.js                 # Roles: driver | parent | admin
│   │   ├── Bus.js                  # Bus registration + driver assignment
│   │   ├── Student.js              # Home coords, geofence radius, parent + driver refs
│   │   ├── Trip.js                 # Status: Active | Completed; delayBroadcastLog
│   │   ├── TripStudent.js          # Per-student alert state per trip; write-once alertTriggered
│   │   ├── DailyAttendance.js      # IVR attendance cancellations; unique (studentId + date)
│   │   ├── SecondaryReceiver.js    # Temp alternate contact with TTL expiry
│   │   ├── CommunicationLog.js     # Append-only voice/SMS/IVR event records
│   │   ├── AuthLog.js              # Login + IVR PIN attempt audit log
│   │   └── PasswordReset.js        # OTP documents with TTL index
│   ├── routes/
│   │   ├── auth.js                 # Register, login, refresh, OTP forgot-password, reset
│   │   ├── trips.js                # Trip start, GPS ping, end, broadcast
│   │   ├── students.js             # CRUD (admin); geospatial update
│   │   ├── drivers.js              # Driver route + student list
│   │   ├── buses.js                # Bus CRUD + driver assignment
│   │   ├── users.js                # Admin user management (suspend, delete, edit)
│   │   ├── ivr.js                  # Arkesel IVR webhook: /inbound, /dtmf, /voice-callback
│   │   ├── broadcast.js            # Delay broadcast endpoint
│   │   └── logs.js                 # GET /api/logs with filter params
│   ├── middleware/
│   │   ├── auth.js                 # JWT verify + passwordChangedAt invalidation
│   │   ├── rbac.js                 # Role-based access control
│   │   └── ivrSignature.js         # X-Arkesel-Signature webhook validation
│   ├── services/
│   │   ├── geofenceEngine.js       # Haversine + threshold logic; alert trigger orchestration
│   │   ├── communicationEngine.js  # Voice call → Arkesel SMS → Hubtel SMS fallback chain
│   │   ├── ivrService.js           # Caller ID lookup, PIN verify, DTMF routing, Arkesel responses
│   │   └── broadcastService.js     # Bulk SMS with deduplication + Promise.allSettled dispatch
│   ├── utils/
│   │   └── haversine.js            # Pure Haversine distance calculation (returns metres)
│   ├── socket/
│   │   └── index.js                # Socket.io rooms: driver:<id>, admin
│   ├── app.js
│   └── server.js
│
├── client-driver/                  # React Native (Expo) — Driver app, Android only
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login.jsx
│   │   ├── (trip)/
│   │   │   ├── dashboard.jsx       # Pre-trip home: student list, start button
│   │   │   ├── active-trip.jsx     # Live checklist, GPS status, end/broadcast buttons
│   │   │   └── delay-broadcast.jsx # Broadcast composition + send confirmation
│   │   └── _layout.jsx
│   ├── services/
│   │   ├── gpsService.js           # expo-task-manager background location task
│   │   ├── pingQueue.js            # Offline ping queue (max 60; replay on reconnect)
│   │   └── api.js
│   └── app.json                    # Requests foreground + background location permissions
│
├── client-web/                     # React.js — Admin Web Portal
│   ├── src/
│   │   ├── pages/
│   │   │   └── admin/
│   │   │       ├── Users.jsx           # User management: admins, drivers, parents
│   │   │       ├── Buses.jsx           # Bus CRUD + driver assignment
│   │   │       ├── Students.jsx        # Student table + geospatial map workspace
│   │   │       └── ActivityLog.jsx     # Communication + activity log with filters
│   │   ├── components/
│   │   │   └── MapWorkspace.jsx        # Leaflet.js map: pin placement, geofence circles
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── main.jsx
│   └── vite.config.js
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (free tier works)
- Arkesel API account (for voice, SMS, and IVR)
- Hubtel account (for SMS second-level fallback; optional but recommended)
- Android device or emulator (for driver app)
- Expo CLI: `npm install -g expo-cli`

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/awabus.git
cd awabus
```

### 2. Set Up the Backend

```bash
cd server
npm install
cp ../.env.example .env
# Fill in your environment variables (see below)
npm run dev
```

### 3. Set Up the Admin Web Portal

```bash
cd client-web
npm install
npm run dev
```

### 4. Set Up the Driver App

```bash
cd client-driver
npm install
npx expo start
# Scan QR code with Expo Go on your Android device
# Grant "Always Allow" location permission when prompted — required for background GPS
```

> **Note:** Background location ("Always Allow") must be granted before the driver can start a trip. The app enforces this at the OS prompt level and disables the "Start Trip" button until permission is confirmed.

---

## Environment Variables

Create a `.env` file in `/server` based on `.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/awabus

# JWT
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=7d

# Arkesel API
ARKESEL_API_KEY=your_arkesel_api_key
ARKESEL_SENDER_ID=AwaBus
ARKESEL_IVR_NUMBER=+233XXXXXXXXX
ARKESEL_BASE_URL=https://sms.arkesel.com/api/v2
ARKESEL_WEBHOOK_SECRET=your_shared_webhook_secret

# Hubtel (SMS second-level fallback)
HUBTEL_CLIENT_ID=your_hubtel_client_id
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret
HUBTEL_SENDER_ID=AwaBus

# Geofence
DEFAULT_GEOFENCE_RADIUS_METRES=500
GPS_PING_INTERVAL_SECONDS=10

# Attendance
ATTENDANCE_CUTOFF_TIME=06:30

# Frontend URLs (for CORS)
CLIENT_WEB_URL=https://awabus.vercel.app
CLIENT_DRIVER_APP_URL=exp://localhost:8081
```

---

## API Documentation

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Admin | Create a user (admin, driver, or parent) |
| POST | `/api/auth/login` | Public | Login with phone + password; returns JWT |
| POST | `/api/auth/refresh` | Auth | Refresh JWT (rate limited: 10/hr/user) |
| POST | `/api/auth/forgot-password` | Public | Initiate SMS OTP flow |
| POST | `/api/auth/verify-otp` | Public | Validate OTP; returns short-lived reset token |
| POST | `/api/auth/reset-password` | Public | Set new password using reset token |

### Users (Admin)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | Paginated, filterable user list |
| PUT | `/api/users/:id` | Admin | Update name, phone, role, status |
| PATCH | `/api/users/:id/status` | Admin | Suspend or reactivate user |
| DELETE | `/api/users/:id` | Admin | Hard or soft delete (based on history) |

### Buses (Admin)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/buses` | Admin | List all buses |
| POST | `/api/buses` | Admin | Create bus |
| PUT | `/api/buses/:id` | Admin | Update bus details |
| PATCH | `/api/buses/:id/assign-driver` | Admin | Assign driver to bus |
| DELETE | `/api/buses/:id` | Admin | Delete bus (only if unassigned + no trips) |

### Students (Admin)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/students` | Admin | List all students |
| POST | `/api/students` | Admin | Create student with geofence coordinates |
| PUT | `/api/students/:id` | Admin | Update student (incl. coordinate drag-drop) |
| DELETE | `/api/students/:id` | Admin | Hard or soft delete (based on history) |

### Trips (Driver)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/drivers/me/route` | Driver | Get assigned bus + student list for today |
| POST | `/api/trips/start` | Driver | Initiate trip; creates TripStudent records |
| POST | `/api/trips/ping` | Driver | Stream GPS coordinate `{ tripId, lat, lng, timestamp }` |
| POST | `/api/trips/end` | Driver | Mark trip Completed; resolve pending students |
| POST | `/api/trips/broadcast` | Driver | Send delay SMS broadcast to attending parents |

### IVR Webhooks

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/ivr/inbound` | Arkesel (webhook) | Handle inbound IVR call; caller ID lookup |
| POST | `/api/ivr/dtmf` | Arkesel (webhook) | Handle DTMF keypress events; route actions |
| POST | `/api/ivr/voice-callback` | Arkesel (webhook) | Receive call outcome; trigger SMS fallback if failed |

### Logs (Admin)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/logs` | Admin | Paginated, filterable communication + activity log |

---

## Database Schema

### User
```js
{
  name: String,
  phone: { type: String, unique: true },          // E.164 format
  passwordHash: String,                            // bcrypt, 12 salt rounds (admins + drivers only)
  ivrPinHash: String,                              // bcrypt, 10 salt rounds (parents only)
  role: { type: String, enum: ['driver', 'parent', 'admin'] },
  status: { type: String, enum: ['active', 'suspended', 'deleted'] },
  mustChangePassword: { type: Boolean, default: true },
  assignedBusId: { type: ObjectId, ref: 'Bus' },  // drivers only
  loginAttempts: Number,
  lockoutUntil: Date,
  passwordChangedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Bus
```js
{
  registrationNumber: { type: String, unique: true },
  nickname: String,
  capacity: Number,
  assignedDriverUserId: { type: ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['Idle', 'Active Trip', 'Maintenance'] },
  createdAt: Date
}
```

### Student
```js
{
  name: String,
  parentUserId: { type: ObjectId, ref: 'User' },
  driverUserId: { type: ObjectId, ref: 'User', index: true },
  homeLatitude: { type: Number, required: true },
  homeLongitude: { type: Number, required: true },
  geofenceRadius: { type: Number, default: 500 },   // metres; 100–2000
  active: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

### Trip
```js
{
  driverUserId: { type: ObjectId, ref: 'User', index: true },
  busId: { type: ObjectId, ref: 'Bus' },
  startTime: Date,
  endTime: Date,
  status: { type: String, enum: ['Active', 'Completed'], index: true },
  delayBroadcastLog: [{ timestamp: Date, delayMinutes: Number, recipientCount: Number }]
}
```

### TripStudent
```js
{
  tripId: { type: ObjectId, ref: 'Trip', index: true },
  studentId: { type: ObjectId, ref: 'Student' },
  attending: { type: Boolean, default: true },
  alertTriggered: { type: Boolean, default: false },  // write-once; NEVER set back to false
  alertTimestamp: Date,
  manuallyResolved: { type: Boolean, default: false },
  createdAt: Date
}
// COMPOUND INDEX: { tripId, attending, alertTriggered }
```

### DailyAttendance
```js
{
  studentId: { type: ObjectId, ref: 'Student' },
  date: Date,
  attending: Boolean,
  updatedByIVR: { type: Boolean, default: false },
  timestamp: Date,
  updatedAt: Date
}
// UNIQUE INDEX: { studentId, date }
```

### SecondaryReceiver
```js
{
  parentUserId: { type: ObjectId, ref: 'User' },
  studentId: { type: ObjectId, ref: 'Student' },
  phone: String,                                  // E.164
  expiresAt: Date,                                // TTL index
  createdAt: Date
}
```

### CommunicationLog
```js
{
  tripStudentId: { type: ObjectId, ref: 'TripStudent' },
  studentId: { type: ObjectId, ref: 'Student' },
  driverId: { type: ObjectId, ref: 'User' },
  parentUserId: { type: ObjectId, ref: 'User' },
  type: { type: String, enum: ['proximity_alert', 'sms_fallback', 'ivr_cancellation', 'ivr_bridge', 'delay_broadcast'] },
  channel: { type: String, enum: ['voice', 'sms', 'ivr'] },
  status: { type: String, enum: ['sent', 'delivered', 'failed'] },
  recipientPhone: String,
  arkeselResponseCode: String,
  hubtelResponseCode: String,
  retryCount: Number,
  failureReason: String,
  arkeselCallId: String,
  arkeselSessionId: String,
  timestamp: Date
}
// APPEND-ONLY — log entries are never updated or deleted
```

### AuthLog
```js
{
  userId: { type: ObjectId, ref: 'User' },
  ip: String,
  userAgent: String,
  channel: { type: String, enum: ['web', 'driver_app', 'ivr'] },
  success: Boolean,
  timestamp: Date
}
```

### PasswordReset
```js
{
  userId: { type: ObjectId, ref: 'User' },
  otpHash: String,                  // bcrypt
  expiresAt: Date,                  // TTL index (5 minutes)
  used: Boolean,
  otpAttempts: Number,
  timestamp: Date
}
```

---

## Testing

### Run Unit Tests

```bash
cd server
npm test
```

### Test Coverage

| Area | Method | Tool |
|---|---|---|
| Haversine ±1m accuracy at 500m | Unit test | Jest |
| Geofence triggers at exactly 500m | Unit test | Jest |
| Geofence does not trigger at 510m | Unit test | Jest |
| Duplicate alert prevented by `alertTriggered` flag | Unit test | Jest |
| Cannot start second active trip (409 Conflict) | Unit test | Jest |
| `SecondaryReceiver` TTL expiry → reverts to primary | Unit test | Jest |
| Attendance toggle blocked after 06:30 AM | Integration test | Supertest |
| IVR Press 1 after cutoff: no DB mutation, voice rejection | Integration test | Supertest |
| IVR Press 2: driver bridge call initiated | Integration test | Supertest |
| IVR PIN: 3 failures → session blocked | Integration test | Supertest |
| Voice call failure triggers SMS fallback | Integration test | Supertest |
| Broadcast deduplicates multi-student parent | Integration test | Supertest |
| JWT expired → 401, redirect to login | Integration test | Supertest |
| Full end-to-end trip workflow | System test | Manual |
| Geofence accuracy across 200m–800m | Accuracy test | Mock GPS coords |
| Driver app, Admin portal | Usability study | SUS questionnaire |

### Geofence Accuracy Test Coordinates

Simulated distances from a fixed test student home coordinate:

| Simulated Distance | Expected Outcome |
|---|---|
| 200m | Alert triggers ✅ |
| 400m | Alert triggers ✅ |
| 490m | Alert triggers ✅ |
| 500m | Alert triggers ✅ (inclusive boundary) |
| 510m | No alert ❌ |
| 600m | No alert ❌ |
| 800m | No alert ❌ |

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Backend API | Railway | Free tier for prototype |
| Admin Web Portal | Vercel | Free tier |
| Driver Android App | Expo EAS Build | APK for direct install during testing |
| MongoDB | MongoDB Atlas | Free M0 cluster |
| IVR + Voice + SMS | Arkesel | Paid per API credit |
| SMS Fallback | Hubtel | Paid per SMS |

### Deploy Backend to Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Deploy Admin Portal to Vercel

```bash
cd client-web
npx vercel --prod
```

### Build Driver App APK via Expo EAS

```bash
cd client-driver
npx eas build --platform android --profile preview
```

---

## Budget

| Item | Cost (GHS) |
|---|---|
| Internet / Data Bundles | GHS 250 |
| Arkesel API Credits (Voice, SMS, IVR) | GHS 250 |
| Cloud Hosting (Railway/Vercel) | GHS 150 |
| Miscellaneous / Contingency | GHS 70 |
| **Total** | **GHS 720** |

---

## Team

| Name | Student ID | Role |
|---|---|---|
| David Nii Ayi Laryea | 11253339 | Developer |
| Mc-Essel Kweku Bondzie | 11354613 | Developer |

**Supervisor:** Prof. Matilda S.A. Wilson
**Institution:** University of Ghana, Department of Computer Science
**Programme:** BSc. Information Technology
**Academic Year:** 2025/2026

---

## Acknowledgements

- [Arkesel](https://arkesel.com) — Voice Call, SMS, and IVR APIs for Ghana
- [Expo](https://expo.dev) — React Native toolchain for Android background GPS
- [Leaflet.js](https://leafletjs.com) — Open-source interactive maps (Admin Portal)
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Cloud database
- [Railway](https://railway.app) — Backend hosting

---

*AwaBus — Keeping Ghanaian children safe, one proximity alert at a time.*
