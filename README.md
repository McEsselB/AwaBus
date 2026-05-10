# AwaBus

> **Geofence-Triggered Automated Proximity Alert and Communication System for School Transport in Ghana**

A school bus proximity alert system purpose-built for the Ghanaian school transport ecosystem. When a school bus enters a configurable radius around a child's drop-off point, AwaBus automatically triggers a voice call (robocall) to the parent — no smartphone, no data connection, no app required on the parent's end.

---

## Table of Contents

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

1. Driver opens the app and initiates a trip with one tap
2. The app streams GPS coordinates to the backend in real time via a foreground service
3. The backend runs a Haversine geofence check against every active student's drop-off coordinates on each GPS ping
4. When the bus enters the 500m radius, an automated voice call fires to the parent (or secondary receiver)
5. If the call fails, an SMS fallback is dispatched immediately
6. Parents without smartphones can dial the school's IVR line to cancel their ward's seat or be bridged directly to the driver — using only a basic phone call

---

## Key Features

### Driver Android App
- Foreground GPS service that streams continuously even when phone is locked
- Dynamic student attendance list filtered per active trip
- One-tap trip initiation and completion
- Delay broadcast: notify all parents on the route via bulk SMS/voice with a single tap

### Parent PWA (Progressive Web App)
- Works on any browser — no app store download required
- Toggle ward attendance per session (with cutoff deadline enforcement)
- Designate a secondary receiver (neighbour, caregiver, sibling) with session-scoped expiry
- Real-time ward status: On Bus → Alert Sent → Dropped Off

### IVR Inbound Channel
- Dedicated school dial-in number powered by Arkesel
- Caller ID recognition: registered parents are greeted by ward name automatically
- Unrecognised numbers prompted for a 4-digit PIN
- **Press 1** → cancel ward's bus seat for the session
- **Press 2** → bridge call directly to driver/attendant
- Cancellation deadline enforcement with recorded voice rejection after cutoff

### Geofence Engine (Backend)
- Haversine formula computed server-side on every GPS ping — no external mapping library
- Per-student geofence with configurable radius (default: 500m)
- One-time alert trigger per student per trip (no duplicate calls)
- Secondary receiver logic: if a secondary receiver is set, voice call goes to them; SMS confirmation goes to primary parent

### Admin Dashboard
- Full CRUD: Students, Drivers, Buses, Route Assignments
- Student-to-driver mapping
- System activity and communication log viewer

---

## System Architecture

```
┌─────────────────────┐         GPS Pings (REST)        ┌──────────────────────────┐
│  Driver Android App  │ ──────────────────────────────▶ │                          │
│  (React Native/Expo) │                                  │   Node.js / Express.js   │
└─────────────────────┘                                  │       Backend API         │
                                                         │                          │
┌─────────────────────┐         REST + WebSocket         │  ┌────────────────────┐  │
│   Parent PWA         │ ◀──────────────────────────────▶│  │  Geofence Engine   │  │
│   (React.js)         │                                  │  │  (Haversine calc)  │  │
└─────────────────────┘                                  │  └────────────────────┘  │
                                                         │           │               │
┌─────────────────────┐         REST                     │           ▼               │
│   Admin Dashboard    │ ◀──────────────────────────────▶│  ┌────────────────────┐  │
│   (React.js)         │                                  │  │ Communication      │  │
└─────────────────────┘                                  │  │ Engine             │  │
                                                         │  └──────────┬─────────┘  │
┌─────────────────────┐         Webhook (IVR events)     │             │             │
│   Arkesel IVR        │ ──────────────────────────────▶ │  ┌──────────▼─────────┐  │
│   (Inbound calls)    │                                  │  │  IVR Webhook       │  │
└─────────────────────┘                                  │  │  Handler           │  │
                                                         │  └────────────────────┘  │
┌─────────────────────┐         API Calls                └──────────────────────────┘
│   Arkesel API        │ ◀────────────────────────────────────────────────────────────
│ (Voice / SMS / IVR)  │                                            │
└─────────────────────┘                                             ▼
                                                         ┌──────────────────────────┐
                                                         │       MongoDB Atlas       │
                                                         │   (Mongoose ODM)          │
                                                         └──────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Driver Mobile App | React Native (Expo), `expo-location`, `expo-task-manager` |
| Parent & Admin UI | React.js (Vite), PWA (service worker + web app manifest) |
| Backend API | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Real-time | Socket.io |
| Communication | Arkesel API (Voice Call, SMS, IVR), Hubtel (fallback) |
| Geofence Logic | Haversine formula (pure Node.js) |
| Authentication | JWT (stateless), bcrypt (passwords + IVR PINs) |
| Testing | Jest, Supertest |
| Hosting | Railway (backend), Vercel (frontend PWA), MongoDB Atlas (DB) |
| Design | Figma |
| Version Control | Git, GitHub |

---

## Project Structure

```
awabus/
├── server/                        # Node.js / Express backend
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── arkesel.js             # Arkesel API config
│   ├── models/
│   │   ├── User.js                # Roles: driver | parent | admin
│   │   ├── Student.js             # Home coords, parent ref, driver ref
│   │   ├── Trip.js                # Status: Idle | Active | Completed
│   │   ├── TripStudent.js         # Per-student alert state per trip
│   │   ├── SecondaryReceiver.js   # Temp alternate contact with expiry
│   │   └── CommunicationLog.js    # Voice/SMS/IVR event records
│   ├── routes/
│   │   ├── auth.js                # Register, login, refresh
│   │   ├── trips.js               # Trip initiation, GPS ping endpoint
│   │   ├── students.js            # CRUD (admin)
│   │   ├── drivers.js             # CRUD (admin)
│   │   ├── parents.js             # Attendance toggle, secondary receiver
│   │   ├── ivr.js                 # Arkesel IVR webhook handler
│   │   └── broadcast.js           # Delay broadcast endpoint
│   ├── middleware/
│   │   ├── auth.js                # JWT verify middleware
│   │   └── rbac.js                # Role-based access control
│   ├── services/
│   │   ├── geofenceEngine.js      # Haversine + threshold logic
│   │   ├── communicationEngine.js # Voice call → SMS fallback logic
│   │   ├── ivrService.js          # Caller ID lookup, PIN verify, DTMF routing
│   │   └── broadcastService.js    # Bulk notify all parents on route
│   ├── utils/
│   │   └── haversine.js           # Pure Haversine distance calculation
│   ├── socket/
│   │   └── index.js               # Socket.io event handlers
│   ├── app.js
│   └── server.js
│
├── client-driver/                 # React Native (Expo) — Android only
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login.jsx
│   │   ├── (trip)/
│   │   │   ├── attendance.jsx     # Active student list
│   │   │   ├── active-trip.jsx    # Live trip view
│   │   │   └── delay-broadcast.jsx
│   │   └── _layout.jsx
│   ├── services/
│   │   ├── gpsService.js          # expo-location foreground service
│   │   └── api.js
│   └── app.json
│
├── client-web/                    # React.js PWA — Parent & Admin
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   └── sw.js                  # Service worker
│   ├── src/
│   │   ├── pages/
│   │   │   ├── parent/
│   │   │   │   ├── Dashboard.jsx       # Ward status display
│   │   │   │   ├── Attendance.jsx      # Toggle attendance per ward
│   │   │   │   └── SecondaryReceiver.jsx
│   │   │   └── admin/
│   │   │       ├── Students.jsx
│   │   │       ├── Drivers.jsx
│   │   │       ├── Assignments.jsx
│   │   │       └── ActivityLog.jsx
│   │   ├── components/
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

### 3. Set Up the Web Client (Parent PWA + Admin Dashboard)

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
```

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
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Arkesel API
ARKESEL_API_KEY=your_arkesel_api_key
ARKESEL_SENDER_ID=AwaBus
ARKESEL_IVR_NUMBER=+233XXXXXXXXX
ARKESEL_BASE_URL=https://sms.arkesel.com/api/v2

# Hubtel (SMS fallback)
HUBTEL_CLIENT_ID=your_hubtel_client_id
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret
HUBTEL_SENDER_ID=AwaBus

# Geofence
DEFAULT_GEOFENCE_RADIUS_METRES=500
GPS_PING_INTERVAL_SECONDS=10

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

---

## API Documentation

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a user (admin creates driver/parent accounts) |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/auth/refresh` | Auth | Refresh JWT |

### Trips (Driver)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/trips/start` | Driver | Initiate a trip, returns tripId |
| POST | `/api/trips/ping` | Driver | Send GPS coordinates `{ tripId, lat, lng }` |
| POST | `/api/trips/end` | Driver | Mark trip as Completed |
| POST | `/api/trips/broadcast` | Driver | Send delay broadcast to all parents on route |

### Students (Admin)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/students` | Admin | List all students |
| POST | `/api/students` | Admin | Create student |
| PUT | `/api/students/:id` | Admin | Update student |
| DELETE | `/api/students/:id` | Admin | Delete student |
| POST | `/api/students/:id/assign` | Admin | Assign student to driver |

### Parents

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/parents/ward-status` | Parent | Get ward's current trip status |
| POST | `/api/parents/attendance` | Parent | Toggle ward attendance for session |
| POST | `/api/parents/secondary-receiver` | Parent | Set secondary receiver + expiry |

### IVR Webhook

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/ivr/inbound` | Arkesel (webhook) | Handle inbound IVR call events |
| POST | `/api/ivr/dtmf` | Arkesel (webhook) | Handle DTMF keypress events |

---

## Database Schema

### User
```js
{
  name: String,
  phone: { type: String, unique: true },
  passwordHash: String,
  ivrPinHash: String,
  role: { type: String, enum: ['driver', 'parent', 'admin'] },
  createdAt: Date
}
```

### Student
```js
{
  name: String,
  homeLatitude: Number,
  homeLongitude: Number,
  parentUserId: { type: ObjectId, ref: 'User' },
  driverUserId: { type: ObjectId, ref: 'User' },
  geofenceRadius: { type: Number, default: 500 },
  active: { type: Boolean, default: true }
}
```

### Trip
```js
{
  driverUserId: { type: ObjectId, ref: 'User' },
  startTime: Date,
  endTime: Date,
  status: { type: String, enum: ['Idle', 'Active', 'Completed'] }
}
```

### TripStudent
```js
{
  tripId: { type: ObjectId, ref: 'Trip' },
  studentId: { type: ObjectId, ref: 'Student' },
  attending: { type: Boolean, default: true },
  alertTriggered: { type: Boolean, default: false },
  alertTimestamp: Date
}
```

### SecondaryReceiver
```js
{
  parentUserId: { type: ObjectId, ref: 'User' },
  phone: String,
  expiresAt: Date
}
```

### CommunicationLog
```js
{
  tripStudentId: { type: ObjectId, ref: 'TripStudent' },
  type: { type: String, enum: ['proximity_alert', 'sms_fallback', 'ivr_cancellation', 'ivr_bridge', 'delay_broadcast'] },
  channel: { type: String, enum: ['voice', 'sms', 'ivr'] },
  status: { type: String, enum: ['sent', 'delivered', 'failed'] },
  recipientPhone: String,
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
| Haversine distance calculation | Unit test | Jest |
| Geofence threshold (trigger / no-trigger) | Unit test | Jest |
| Trip state machine transitions | Unit test | Jest |
| IVR Caller ID lookup and PIN verification | Unit test | Jest |
| Communication engine (voice → SMS fallback) | Unit test | Jest |
| All REST API endpoints | Integration test | Supertest |
| IVR webhook routing (press-1, press-2, post-deadline) | Integration test | Supertest |
| Full end-to-end workflow | System test | Manual |
| Geofence accuracy at 200m–800m | Accuracy test | Mock GPS coords |
| Driver app, Parent PWA, Admin dashboard | Usability study | SUS questionnaire |

### Geofence Accuracy Test Coordinates

Simulated distances from a fixed test student home coordinate:

| Simulated Distance | Expected Outcome |
|---|---|
| 200m | Alert triggers ✅ |
| 400m | Alert triggers ✅ |
| 490m | Alert triggers ✅ |
| 500m | Alert triggers ✅ |
| 510m | No alert ❌ |
| 600m | No alert ❌ |
| 800m | No alert ❌ |

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Backend API | Railway | Free tier for prototype |
| Parent + Admin PWA | Vercel | Free tier |
| MongoDB | MongoDB Atlas | Free M0 cluster |
| IVR + Voice + SMS | Arkesel | Paid per API credit |

### Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

railway login
railway init
railway up
```

### Deploy Frontend to Vercel

```bash
cd client-web
npx vercel --prod
```

---

## Budget

| Item | Cost (GHS) |
|---|---|
| Internet / Data Bundles | GHS 250 |
| Arkesel API Credits (Voice, SMS, IVR) | GHS 250 |
| Cloud Hosting (Railway/Render) | GHS 150 |
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
- [Expo](https://expo.dev) — React Native toolchain for Android foreground GPS
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Cloud database
- [Railway](https://railway.app) — Backend hosting

---

*AwaBus — Keeping Ghanaian children safe, one proximity alert at a time.*
