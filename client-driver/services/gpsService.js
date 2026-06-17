import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import * as Network from 'expo-network'
import { getPingQueue, addToPingQueue, clearPingQueue } from './pingQueue'
import api from './api'

export const GPS_TASK = 'AWABUS_GPS_TASK'
export const GPS_INTERVAL_MS = 10000 // 10 seconds

let activeTripId = null

export function setActiveTripId(id) {
  activeTripId = id
}

// ── Background task definition ──
// Must be defined at module top level, outside any component
TaskManager.defineTask(GPS_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[GPS] Background task error:', error.message)
    return
  }

  if (!data?.locations?.length) return

  const { latitude, longitude } = data.locations[0].coords
  const timestamp = new Date().toISOString()
  const tripId = activeTripId

  if (!tripId) return

  const ping = { tripId, lat: latitude, lng: longitude, timestamp }

  try {
    const net = await Network.getNetworkStateAsync()
    if (!net.isConnected || !net.isInternetReachable) {
      await addToPingQueue(ping)
      console.log('[GPS] Offline — ping queued')
      return
    }

    // Replay any queued pings first
    const queue = await getPingQueue()
    if (queue.length > 0) {
      for (const p of queue) {
        try { await api.post('/trips/ping', p) } catch { break }
      }
      await clearPingQueue()
    }

    await api.post('/trips/ping', ping)
    console.log(`[GPS] Ping sent: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
  } catch (err) {
    await addToPingQueue(ping)
    console.log('[GPS] Send failed — ping queued')
  }
})

export async function requestLocationPermissions() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync()
  if (fg !== 'granted') return false

  const { status: bg } = await Location.requestBackgroundPermissionsAsync()
  return bg === 'granted'
}

export async function startGPSTracking(tripId) {
  activeTripId = tripId

  const isRunning = await Location.hasStartedLocationUpdatesAsync(GPS_TASK).catch(() => false)
  if (isRunning) return

  await Location.startLocationUpdatesAsync(GPS_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: GPS_INTERVAL_MS,
    distanceInterval: 0,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'AwaBus — Trip Active',
      notificationBody: 'GPS tracking is running. Parents will be alerted automatically.',
      notificationColor: '#FDB913',
    },
  })

  console.log('[GPS] Background tracking started')
}

export async function stopGPSTracking() {
  activeTripId = null
  const isRunning = await Location.hasStartedLocationUpdatesAsync(GPS_TASK).catch(() => false)
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(GPS_TASK)
    console.log('[GPS] Background tracking stopped')
  }
}