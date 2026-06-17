import { View, Text, StyleSheet } from 'react-native'
import { Colors, FontSize, Radius } from '../constants/theme'

const VARIANTS = {
  pending:   { bg: Colors.surface,   text: Colors.textSecondary, dot: Colors.textMuted },
  alert:     { bg: Colors.greenBg,   text: Colors.green,         dot: Colors.green },
  dropped:   { bg: Colors.goldSoft,  text: Colors.gold,          dot: Colors.gold },
  cancelled: { bg: Colors.redBg,     text: Colors.red,           dot: Colors.red },
}

export default function StatusBadge({ status }) {
  const v = VARIANTS[status] ?? VARIANTS.pending
  const labels = {
    pending:   'Pending',
    alert:     'Alert Sent',
    dropped:   'Dropped Off',
    cancelled: 'Cancelled',
  }

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <View style={[styles.dot, { backgroundColor: v.dot }]} />
      <Text style={[styles.label, { color: v.text }]}>{labels[status] ?? status}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})