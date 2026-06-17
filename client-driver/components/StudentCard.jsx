import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { useRef, useEffect } from 'react'
import { Colors, FontSize, Radius, Spacing } from '../constants/theme'
import StatusBadge from './StatusBadge'

export default function StudentCard({ student, onMarkDropped, disabled }) {
  const slideIn = useRef(new Animated.Value(40)).current
  const opacity = useRef(new Animated.Value(0)).current
  const checkScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(opacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  // Pulse animation when alert fires
  useEffect(() => {
    if (student.status === 'alert') {
      Animated.sequence([
        Animated.timing(checkScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.timing(checkScale, { toValue: 1,    duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [student.status])

  const canMarkDropped = student.status === 'alert' && !disabled
  const initials = student.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Animated.View style={[
      styles.card,
      student.status === 'alert' && styles.cardAlert,
      student.status === 'dropped' && styles.cardDropped,
      { transform: [{ translateY: slideIn }, { scale: checkScale }], opacity }
    ]}>
      <View style={styles.left}>
        <View style={[
          styles.avatar,
          student.status === 'alert'   && styles.avatarAlert,
          student.status === 'dropped' && styles.avatarDropped,
        ]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {student.address || `${student.homeLatitude?.toFixed(4)}, ${student.homeLongitude?.toFixed(4)}`}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <StatusBadge status={student.status} />
        {canMarkDropped && (
          <Pressable style={styles.dropBtn} onPress={() => onMarkDropped(student._id)}>
            <Text style={styles.dropBtnText}>✓ Dropped</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
  },
  cardAlert: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(22,163,74,0.06)',
  },
  cardDropped: {
    borderColor: Colors.navyBorder,
    opacity: 0.6,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.navyBorder,
  },
  avatarAlert: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
  },
  avatarDropped: {
    backgroundColor: Colors.goldSoft,
    borderColor: Colors.gold,
  },
  avatarText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  info: { flex: 1 },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  address: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  dropBtn: {
    backgroundColor: Colors.goldSoft,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  dropBtnText: {
    color: Colors.gold,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
})