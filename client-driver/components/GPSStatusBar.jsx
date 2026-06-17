import { View, Text, StyleSheet, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import { Colors, FontSize, Spacing, Radius } from '../constants/theme'

export default function GPSStatusBar({ lat, lng, lastPing, connected }) {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!connected) return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [connected])

  const timeAgo = lastPing
    ? `${Math.floor((Date.now() - new Date(lastPing)) / 1000)}s ago`
    : '—'

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Animated.View style={[
          styles.dot,
          { backgroundColor: connected ? Colors.green : Colors.red, opacity: pulse }
        ]} />
        <Text style={styles.status}>
          {connected ? 'GPS Active' : 'GPS Lost'}
        </Text>
      </View>

      <View style={styles.coords}>
        {lat && lng ? (
          <Text style={styles.coordText}>
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </Text>
        ) : (
          <Text style={styles.coordText}>Acquiring…</Text>
        )}
      </View>

      <Text style={styles.ping}>↑ {timeAgo}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  coords: {
    flex: 1,
    alignItems: 'center',
  },
  coordText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
  },
  ping: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
})