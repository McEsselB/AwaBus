# 🚌 AwaBus

> **Geofence-Triggered Automated Proximity Alert and Communication System for School Transport in Ghana**

A school bus proximity alert system purpose-built for the Ghanaian school transport ecosystem. When a school bus enters a configurable radius around a child's drop-off point, AwaBus automatically triggers a voice call (robocall) to the parent — no smartphone, no data connection, no app required on the parent's end.

Parents can interact with the system through **whichever interface suits them best** — a React Native mobile app or a browser-based PWA. Both connect to the same backend and share the same real-time data. Parents on basic phones are covered entirely by the IVR dial-in channel.

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
2. The app streams GPS coordinates to the backend in real time via a foreground service
3. The backend runs a Haversine geofence check against every active student's drop-off coordinates on each GPS ping
4. When the bus enters the 500m radius, an automated voice call fires to the parent (or secondary receiver)
5. If the call fails, an SMS fallback is dispatched immediately
6. Parents manage attendance and preferences via the **React Native parent app** or the **browser-based PWA** — both are fully supported and share the same live data
7. Parents without smartphones can dial the school's IVR line to cancel their ward's seat or be bridged directly to the driver — using only a basic phone call

---

## Key Features

### 🚗 Driver Android App
- Foreground GPS service that streams continuously even when phone is locked
- Dynamic student attendance list filtered per active trip
- One-tap trip initiation and completion
- Delay broadcast: notify all parents on the route via bulk SMS/voice with a single tap

### 📱 Parent Mobile App (React Native / Expo)
- Native Android and iOS app for smartphone-using parents
- Toggle ward attendance per session (with cutoff deadline enforcement)
- Designate a secondary receiver (neighbour, caregiver, sibling) with session-scoped expiry
- Real-time ward status updates via Socket.io: On Bus → Alert Sent → Dropped Off
- Push notification support for proximity alerts
- No GPS permissions required — location is never collected from parents

### 🌐 Parent PWA (Progressive Web App)
- Browser-based alternative — works on any device, no app install required
- Identical feature set to the mobile app: attendance toggle, secondary receiver, ward status
- Offline-capable via service worker (ward status cached locally)
- Same backend, same real-time data — parents can switch between app and PWA freely

### 📞 IVR Inbound Channel
- Dedicated school dial-in number powered by Arkesel
- Caller ID recognition: registered parents are greeted by ward name automatically
- Unrecognised numbers prompted for a 4-digit PIN
- **Press 1** → cancel ward's bus seat for the session
- **Press 2** → bridge call directly to driver/attendant
- Cancellation deadline enforcement with recorded voice rejection after cutoff

### 🗺️ Geofence Engine (Backend)
- Haversine formula computed server-side on every GPS ping — no external mapping library
- Per-student geofence with configurable radius (default: 500m)
- One-time alert trigger per student per trip (no duplicate calls)
- Secondary receiver logic: if a secondary receiver is set, voice call goes to them; SMS confirmation goes to primary parent

### 🛠️ Admin Dashboard
- Full CRUD: Students, Drivers, Buses, Route Assignments
- Student-to-driver mapping
- System activity and communication log viewer

---

## System Architecture

```
┌─────────────────────┐    GPS Pings (REST)     ┌──────────────────────────────────┐
│  Driver Android App  │ ──────────────────────▶ │                                  │
│  (React Native/Expo) │                          │     Node.js / Express.js         │
└─────────────────────┘                          │         Backend API               │
                                                 │                                  │
┌─────────────────────┐    REST + WebSocket      │   ┌────────────────────────┐     │
│  Parent Mobile App   │ ◀───────────────────────▶   │   Geofence Engine      │     │
│  (React Native/Expo) │                          │   │   (Haversine calc)     │     │
└─────────────────────┘                          │   └───────────┬────────────┘     │
                                                 │               │                  │
┌─────────────────────┐    REST + WebSocket      │               ▼                  │
│   Parent PWA         │ ◀───────────────────────▶   ┌────────────────────────┐     │
│   (React.js)         │                          │   │  Communication Engine  │     │
└─────────────────────┘                          │   │  Voice → SMS fallback  │     │
                                                 │   └───────────┬────────────┘     │
┌─────────────────────┐    REST                  │               │                  │
│   Admin Dashboard    │ ◀───────────────────────▶   ┌───────────▼────────────┐     │
│   (React.js)         │                          │   │   IVR Webhook Handler  │     │
└─────────────────────┘                          │   └────────────────────────┘     │
                                                 │                                  │
┌─────────────────────┐    Webhook (IVR events)  └──────────────────────────────────┘
│   Arkesel IVR        │ ──────────────────────▶               │
│   (Inbound calls)    │                                        ▼
└─────────────────────┘                          ┌──────────────────────────────────┐
                                                 │          MongoDB Atlas            │
┌─────────────────────┐    API Calls             │         (Mongoose ODM)            │
│   Arkesel API        │ ◀─────────────────────  └──────────────────────────────────┘
│ (Voice / SMS / IVR)  │
└─────────────────────┘

         ┌─────────────────────────────────────────────────────────┐
         │              Shared Backend — One Source of Truth         │
         │  Parent Mobile App and Parent PWA connect to the same    │
         │  API, same MongoDB, same Socket.io events. A parent can  │
         │  toggle attendance on the PWA and see it instantly on    │
         │  the app — and vice versa.                               │
         └─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Driver Mobile App | React Native (Expo), `expo-location`, `expo-task-manager` |
| Parent Mobile App | React Native (Expo) — separate Expo project, no GPS permissions |
| Parent & Admin Web | React.js (Vite), PWA (service worker + web app manifest) |
| Backend API | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Real-time | Socket.io |
| Communication | Arkesel API (Voice Call, SMS, IVR), Hubtel (fallback) |
| Geofence Logic | Haversine formula (pure Node.js) |
| Authentication | JWT (stateless), bcrypt (passwords + IVR PINs) |
| Testing | Jest, Supertest |
| Hosting | Railway (backend), Vercel (PWA), Expo EAS (mobile apps), MongoDB Atlas (DB) |
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
├── client-driver/                 # React Native (Expo) — Driver app, Android only
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
│   └── app.json                   # Requests foreground location permissions
│
├── client-parent/                 # React Native (Expo) — Parent mobile app
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login.jsx
│   │   ├── (home)/
│   │   │   ├── dashboard.jsx      # Ward status: On Bus / Alert Sent / Dropped Off
│   │   │   ├── attendance.jsx     # Toggle ward attendance for session
│   │   │   └── secondary-receiver.jsx  # Set temp alternate contact
│   │   └── _layout.jsx
│   ├── services/
│   │   └── api.js                 # Same API calls as PWA — shared endpoint contracts
│   └── app.json                   # No location permissions required
│
├── client-web/                    # React.js PWA — Parent (browser) & Admin Dashboard
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   └── sw.js                  # Service worker (offline ward status cache)
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
- Android device or emulator (for driver and parent apps)
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

### 5. Set Up the Parent Mobile App

```bash
cd client-parent
npm install
npx expo start
# Scan QR code with Expo Go on your Android device
# Uses the same backend as the PWA — log in with the same parent credentials
```

> **Note:** The parent mobile app and the parent PWA share the same backend API and database. A parent can toggle attendance on the PWA and the change reflects instantly in the mobile app via Socket.io — and vice versa.

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

# Frontend URLs (for CORS — all three accepted)
CLIENT_WEB_URL=http://localhost:5173
CLIENT_PARENT_APP_URL=exp://localhost:8082
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
| Driver app, Parent PWA, Parent mobile app, Admin dashboard | Usability study | SUS questionnaire |

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
| Driver Android App | Expo EAS Build | APK for direct install during testing |
| Parent Android App | Expo EAS Build | APK for direct install during testing |
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

### Deploy Frontend PWA to Vercel

```bash
cd client-web
npx vercel --prod
```

### Build Android APKs via Expo EAS

```bash
# Driver app
cd client-driver
npx eas build --platform android --profile preview

# Parent app
cd client-parent
npx eas build --platform android --profile preview
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
