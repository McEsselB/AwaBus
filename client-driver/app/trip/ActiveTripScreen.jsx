import {
  View, Text, ScrollView, StyleSheet,
  Alert, Animated, useWindowDimensions
} from 'react-native'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme'
import api from '../../services/api'
import { stopGPSTracking } from '../../services/gpsService'
import * as Location from 'expo-location'
import Button from '../../components/Button'
import GPSStatusBar from '../../components/GPSStatusBar'
import StudentCard from '../../components/StudentCard'
import Toast from 'react-native-toast-message'

export default function ActiveTripScreen({ trip, initialStudents, onTripEnd, onBroadcast }) {
  const [students, setStudents] = useState(
    initialStudents.map(s => ({ ...s, status: 'pending' }))
  )
  const [gps, setGps]           = useState({ lat: null, lng: null, lastPing: null, connected: false })
  const [ending, setEnding]     = useState(false)

  const alertCount    = students.filter(s => s.status === 'alert').length
  const droppedCount  = students.filter(s => s.status === 'dropped').length
  const pendingCount  = students.filter(s => s.status === 'pending').length

  const statsSlide = useRef(new Animated.Value(-10)).current
  const statsFade  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(statsSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(statsFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()

    // Poll live GPS position for display
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        setGps({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          lastPing: new Date().toISOString(),
          connected: true,
        })
      } catch {
        setGps(g => ({ ...g, connected: false }))
      }
    }, 5000)

    // Poll trip student statuses from backend (catches geofence alerts)
    const statusPoll = setInterval(async () => {
      try {
        const { data } = await api.get(`/trips/${trip._id}/students`)
        setStudents(prev => prev.map(s => {
          const live = data.students?.find(ls => ls.studentId === s._id)
          if (!live) return s
          if (live.alertTriggered && s.status === 'pending') return { ...s, status: 'alert' }
          return s
        }))
      } catch {}
    }, 8000)

    return () => {
      clearInterval(interval)
      clearInterval(statusPoll)
    }
  }, [])

  async function handleMarkDropped(studentId) {
    setStudents(prev =>
      prev.map(s => s._id === studentId ? { ...s, status: 'dropped' } : s)
    )
    try {
      await api.patch(`/trips/${trip._id}/students/${studentId}/resolve`)
    } catch {
      // Revert on failure
      setStudents(prev =>
        prev.map(s => s._id === studentId ? { ...s, status: 'alert' } : s)
      )
      Toast.show({ type: 'error', text1: 'Could not update student status.' })
    }
  }

  async function handleEndTrip() {
    const unresolvedAlerts = students.filter(s => s.status === 'alert').length
    const message = unresolvedAlerts > 0
      ? `${unresolvedAlerts} student(s) have alerts but are not yet marked as dropped off. End trip anyway?`
      : 'Mark this trip as complete?'

    Alert.alert('End Trip', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Trip',
        style: 'destructive',
        onPress: async () => {
          setEnding(true)
          try {
            await api.post(`/trips/${trip._id}/end`)
            await stopGPSTracking()
            onTripEnd()
          } catch (err) {
            Toast.show({ type: 'error', text1: err.response?.data?.message ?? 'Could not end trip.' })
            setEnding(false)
          }
        }
      }
    ])
  }

  return (
    <View style={styles.outer}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip header */}
        <View style={styles.tripHeader}>
          <View style={styles.tripLive}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>TRIP IN PROGRESS</Text>
          </View>
          <Text style={styles.tripId} numberOfLines={1}>
            ID: {trip._id?.slice(-8).toUpperCase()}
          </Text>
        </View>

        {/* GPS bar */}
        <GPSStatusBar
          lat={gps.lat}
          lng={gps.lng}
          lastPing={gps.lastPing}
          connected={gps.connected}
        />

        {/* Stats row */}
        <Animated.View style={[
          styles.statsRow,
          { opacity: statsFade, transform: [{ translateY: statsSlide }] }
        ]}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <Text style={[styles.statNum, { color: Colors.green }]}>{alertCount}</Text>
            <Text style={styles.statLabel}>Alerted</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: Colors.gold }]}>{droppedCount}</Text>
            <Text style={styles.statLabel}>Dropped</Text>
          </View>
        </Animated.View>

        {/* Student checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student checklist</Text>
          {students.map(s => (
            <StudentCard
              key={s._id}
              student={s}
              onMarkDropped={handleMarkDropped}
              disabled={ending}
            />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Broadcast Delay"
            variant="dark"
            size="md"
            onPress={onBroadcast}
            disabled={ending}
          />
          <Button
            label={ending ? 'Ending trip…' : 'End Trip'}
            variant="danger"
            size="md"
            loading={ending}
            onPress={handleEndTrip}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.navy },
  scroll: { flex: 1 },
  container: {
    padding: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.sm,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Trip header
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  liveText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.green,
    letterSpacing: 1.5,
  },
  tripId: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.navyBorder,
  },
  statNum: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Section
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
})