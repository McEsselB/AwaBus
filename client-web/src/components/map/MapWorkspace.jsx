import { useEffect, useRef } from 'react'
import styles from './MapWorkspace.module.css'

// Driver colors for the map pins
const DRIVER_COLORS = [
  '#E85D24', '#2563EB', '#16A34A', '#9333EA',
  '#D97706', '#DC2626', '#0891B2', '#BE185D',
]

function getDriverColor(driverId, drivers) {
  const idx = drivers.findIndex(d => d._id === driverId)
  return DRIVER_COLORS[idx % DRIVER_COLORS.length] ?? '#888'
}

export default function MapWorkspace({ students = [], drivers = [], mini = false, onMapClick, onStudentClick }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const layersRef = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Dynamically import Leaflet to avoid SSR issues
    let L
    let map

    async function initMap() {
      L = (await import('leaflet')).default

      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }

      // Default center: Accra, Ghana
      map = L.map(mapRef.current, {
        center: [5.6037, -0.1870],
        zoom: mini ? 12 : 11,
        zoomControl: !mini,
        scrollWheelZoom: !mini,
        dragging: !mini,
        doubleClickZoom: !mini,
        touchZoom: !mini,
      })

      instanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Map click to place pin
      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng)
        })
      }

      renderStudents(L, map)
    }

    initMap()

    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
    }
  }, [mini])

  // Re-render student markers when students change
  useEffect(() => {
    const map = instanceRef.current
    if (!map || typeof window === 'undefined') return

    import('leaflet').then(({ default: L }) => {
      // Clear existing layers
      layersRef.current.forEach(l => l.remove())
      layersRef.current = []
      renderStudents(L, map)
    })
  }, [students, drivers])

  function renderStudents(L, map) {
    students.forEach(s => {
      if (!s.homeLatitude || !s.homeLongitude) return

      const driverId = s.driverUserId?._id ?? s.driverUserId
      const color = getDriverColor(driverId, drivers)

      // Geofence circle
      const circle = L.circle([s.homeLatitude, s.homeLongitude], {
        radius: s.geofenceRadius ?? 500,
        color,
        fillColor: color,
        fillOpacity: 0.08,
        weight: 1.5,
      }).addTo(map)

      // Custom icon
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:10px;height:10px;
          background:${color};
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,0.3)
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      })

      const marker = L.marker([s.homeLatitude, s.homeLongitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.6">
            <strong style="font-size:13px">${s.name}</strong><br/>
            <span style="color:#6B7280">Radius: ${s.geofenceRadius ?? 500}m</span>
          </div>
        `)

      if (onStudentClick) {
        marker.on('click', () => onStudentClick(s))
      }

      layersRef.current.push(circle, marker)
    })

    // Fit bounds if there are students
    if (students.length > 0 && !mini) {
      const valid = students.filter(s => s.homeLatitude && s.homeLongitude)
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(s => [s.homeLatitude, s.homeLongitude]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    }
  }

  return (
    <div
      ref={mapRef}
      className={mini ? styles.mapMini : styles.map}
    />
  )
}