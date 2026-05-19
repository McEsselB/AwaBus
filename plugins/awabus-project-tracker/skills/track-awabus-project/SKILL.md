---
name: track-awabus-project
description: Track AwaBus project progress, milestones, backlog, risks, blockers, decisions, and next actions across the backend, driver app, parent app, PWA/admin dashboard, IVR, testing, deployment, and academic deliverables.
---

# Track AwaBus Project

Use this skill when the user asks to track, plan, summarize, review, or organize AwaBus project work.

## Project Context

AwaBus is a geofence-triggered automated proximity alert and communication system for school transport in Ghana. The system streams driver GPS pings, checks each active student's drop-off geofence, sends robocall alerts through Arkesel, falls back to SMS when needed, supports parent attendance controls through React Native and PWA clients, and provides IVR cancellation or driver-bridge flows for parents using basic phones.

## Tracking Areas

Track progress in these workstreams:

- Backend API: Express routes, JWT auth, RBAC, trip state, GPS pings, Socket.io, logs.
- Geofence engine: Haversine distance, per-student radius, one alert per student per trip.
- Communication engine: Arkesel voice alerts, SMS fallback, Hubtel fallback, communication logs.
- IVR: caller ID lookup, PIN fallback, DTMF press-1 cancellation, press-2 bridge, cutoff enforcement.
- Driver app: Expo Android app, foreground location service, active trip screen, attendance list, delay broadcast.
- Parent mobile app: Expo app, attendance toggle, secondary receiver, ward status, push notifications.
- Parent PWA: offline cached ward status, service worker, shared endpoint contracts, realtime updates.
- Admin dashboard: CRUD, assignments, activity and communication log viewer.
- Database: Mongoose models, indexes, seed data, schema consistency.
- Testing: unit, integration, IVR routing, communication fallback, geofence coordinate accuracy, usability study.
- Deployment: Railway or Render backend, Vercel PWA, Expo EAS builds, MongoDB Atlas, Arkesel webhook setup.
- Academic deliverables: proposal, report chapters, diagrams, budget, presentation, demo script.

## Workflow

1. Read the user's latest project update or inspect the repo when needed.
2. Convert the current state into a concise tracker grouped by workstream.
3. Mark each item as one of: `Not started`, `In progress`, `Blocked`, `Ready for test`, `Done`.
4. Capture blockers separately from ordinary TODOs.
5. Record decisions with date, reason, and impact.
6. Keep next actions small enough to complete in one focused coding or writing session.
7. When useful, produce or update a markdown tracker file such as `PROJECT_TRACKING.md`.

## Recommended Tracker Shape

```markdown
# AwaBus Project Tracker

Last updated: YYYY-MM-DD

## Snapshot

| Area | Status | Notes |
|---|---|---|
| Backend API | In progress | Auth and trip routes next |

## Current Sprint

| Priority | Task | Owner | Status | Acceptance Check |
|---|---|---|---|---|
| P0 | Implement GPS ping endpoint | Backend | Not started | Test proves geofence check runs |

## Blockers

| Blocker | Impact | Owner | Next Move |
|---|---|---|---|

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|

## Decisions

| Date | Decision | Reason | Impact |
|---|---|---|---|

## Demo Checklist

- Driver starts trip
- Backend receives GPS ping
- Geofence alert triggers once
- Parent receives voice or SMS fallback
- Parent status updates in app and PWA
- IVR cancellation works before cutoff
```

## Output Style

Be direct and practical. Prefer tables for tracker state and short bullet lists for next actions. If the user asks for implementation help, move from tracking into code changes after identifying the next highest-priority task.

