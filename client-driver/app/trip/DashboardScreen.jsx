import {
  View, Text, ScrollView, StyleSheet,
  Animated, RefreshControl, Alert
} from 'react-native'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme'
import api from '../../services/api'
import { logout } from '../../services/auth'
import { requestLocationPermissions, startGPSTracking } from '../../services/gpsService'
import Button from '../../components/Button'
import Toast from 'react-native-toast-message'

export default function DashboardScreen({ user, onTripStart, onLogout }) {
  const [route, setRoute]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState(false)

  const headerFade = useRef(new Animated.Value(0)).current
  const headerSlide = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start()
    loadRoute()
  }, [])

  async function loadRoute() {
    try {
      const { data } = await api.get('/drivers/me/route')
      setRoute(data)
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not load your route.' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadRoute()
  }, [])

  async function handleStartTrip() {
    Alert.alert(
      'Start Trip',
      `You are about to begin today's route with ${route?.students?.length ?? 0} students. GPS tracking will start immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Trip',
          style: 'default',
          onPress: async () => {
            setStarting(true)
            try {
              const hasPermission = await requestLocationPermissions()
              if (!hasPermission) {
                Toast.show({
                  type: 'error',
                  text1: 'Location permission required.',
                  text2: 'Go to Settings and allow location access to start a trip.',
                })
                return
              }

              const { data } = await api.post('/trips/start', {
                busId: route.bus._id,
              })

              await startGPSTracking(data.trip._id)
              onTripStart(data.trip, route.students)
            } catch (err) {
              const msg = err.response?.data?.message ?? 'Could not start trip.'
              Toast.show({ type: 'error', text1: msg })
            } finally {
              setStarting(false)
            }
          }
        }
      ]
    )
  }

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          onLogout()
        }
      }
    ])
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
    >
      {/* Header */}
      <Animated.View style={[
        styles.header,
        { opacity: headerFade, transform: [{ translateY: headerSlide }] }
      ]}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.driverName}>{user?.name?.split(' ')[0]}</Text>
        </View>
        <Button label="Sign out" variant="ghost" size="sm" onPress={handleLogout} />
      </Animated.View>

      {/* Bus card */}
      {route?.bus && (
        <View style={styles.busCard}>
          <View style={styles.busCardLeft}>
            <Text style={styles.busLabel}>Your bus</Text>
            <Text style={styles.busReg}>{route.bus.registrationNumber}</Text>
            {route.bus.nickname && (
              <Text style={styles.busNick}>{route.bus.nickname}</Text>
            )}
          </View>
          <View style={styles.busCapacity}>
            <Text style={styles.capacityNum}>{route.students?.length ?? 0}</Text>
            <Text style={styles.capacityLabel}>students{'\n'}today</Text>
          </View>
        </View>
      )}

      {/* Student list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's route</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading route…</Text>
        ) : !route?.students?.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No students assigned to your route yet.</Text>
            <Text style={styles.emptySubText}>Pull down to refresh.</Text>
          </View>
        ) : (
          route.students.map((s, i) => (
            <Animated.View key={s._id} style={styles.studentRow}>
              <View style={styles.studentNum}>
                <Text style={styles.studentNumText}>{i + 1}</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentCoords}>
                  {s.homeLatitude?.toFixed(4)}, {s.homeLongitude?.toFixed(4)} · {s.geofenceRadius}m radius
                </Text>
              </View>
            </Animated.View>
          ))
        )}
      </View>

      {/* Start trip CTA */}
      <View style={styles.ctaWrap}>
        {!route?.bus ? (
          <View style={styles.warnCard}>
            <Text style={styles.warnText}>
              No bus assigned to your account. Contact your administrator.
            </Text>
          </View>
        ) : (
          <>
            <Button
              label="Start Trip"
              variant="primary"
              size="full"
              loading={starting}
              disabled={!route?.students?.length}
              onPress={handleStartTrip}
            />
            {!route?.students?.length && (
              <Text style={styles.ctaHint}>Add students to your route before starting.</Text>
            )}
          </>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.navy },
  container: {
    padding: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  driverName: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },

  // Bus card
  busCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busCardLeft: { gap: 4 },
  busLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  busReg: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  busNick: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  busCapacity: { alignItems: 'flex-end' },
  capacityNum: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.gold,
    lineHeight: 36,
  },
  capacityLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    lineHeight: 16,
  },

  // Section
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  // Student rows
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
  },
  studentNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentNumText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  studentCoords: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },

  // Empty
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.navyBorder,
    gap: Spacing.xs,
  },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center' },
  emptySubText: { color: Colors.textMuted, fontSize: FontSize.sm },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', padding: Spacing.xl },

  // Warn
  warnCard: {
    backgroundColor: Colors.redBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  warnText: { color: Colors.red, fontSize: FontSize.sm, lineHeight: 20 },

  // CTA
  ctaWrap: { gap: Spacing.sm },
  ctaHint: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
})