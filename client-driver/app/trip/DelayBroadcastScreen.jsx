import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated
} from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme'
import api from '../../services/api'
import Button from '../../components/Button'
import Toast from 'react-native-toast-message'

const DELAY_OPTIONS = [5, 10, 15, 20, 30, 45]

export default function DelayBroadcastScreen({ trip, onBack }) {
  const [selectedDelay, setSelectedDelay] = useState(null)
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending]             = useState(false)
  const [sent, setSent]                   = useState(false)

  const fadeIn   = useRef(new Animated.Value(0)).current
  const slideUp  = useRef(new Animated.Value(20)).current
  const tickScale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()
  }, [])

  function animateSent() {
    Animated.spring(tickScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 5,
      bounciness: 12,
    }).start()
  }

  async function handleSend() {
    if (!selectedDelay) {
      Toast.show({ type: 'error', text1: 'Select a delay duration first.' })
      return
    }
    setSending(true)
    try {
      await api.post(`/trips/${trip._id}/broadcast`, {
        delayMinutes: selectedDelay,
        message: customMessage.trim() || undefined,
      })
      setSent(true)
      animateSent()
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message ?? 'Broadcast failed.' })
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <View style={styles.successOuter}>
        <Animated.View style={[styles.successContent, { transform: [{ scale: tickScale }] }]}>
          <View style={styles.tick}>
            <Text style={styles.tickText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Broadcast sent</Text>
          <Text style={styles.successSub}>
            All attending parents have been notified of the {selectedDelay}-minute delay via SMS.
          </Text>
        </Animated.View>
        <Button label="Back to trip" variant="primary" size="full" onPress={onBack} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.inner, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* Header */}
          <View style={styles.header}>
            <Button label="← Back" variant="ghost" size="sm" onPress={onBack} />
          </View>

          <View style={styles.headingWrap}>
            <Text style={styles.heading}>Broadcast delay</Text>
            <Text style={styles.sub}>
              An SMS will be sent to all parents whose children are on today's route.
              Parents with multiple children receive only one message.
            </Text>
          </View>

          {/* Delay picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Delay duration</Text>
            <View style={styles.delayGrid}>
              {DELAY_OPTIONS.map(min => (
                <Animated.View key={min} style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.delayChip,
                      selectedDelay === min && styles.delayChipActive
                    ]}
                    onStartShouldSetResponder={() => true}
                    onResponderRelease={() => setSelectedDelay(min)}
                  >
                    <Text style={[
                      styles.delayChipText,
                      selectedDelay === min && styles.delayChipTextActive
                    ]}>
                      {min} min
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Optional message */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Additional note (optional)</Text>
            <TextInput
              style={styles.textArea}
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="e.g. Traffic on the Accra–Tema motorway."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={160}
            />
            <Text style={styles.charCount}>{customMessage.length}/160</Text>
          </View>

          {/* Preview */}
          {selectedDelay && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Message preview</Text>
              <Text style={styles.previewText}>
                AwaBus: Your child's bus will be approximately {selectedDelay} minutes late today.
                {customMessage ? ` ${customMessage.trim()}` : ''} — AwaBus School Transport
              </Text>
            </View>
          )}

          <Button
            label={`Send to all parents`}
            variant="primary"
            size="full"
            loading={sending}
            disabled={!selectedDelay}
            onPress={handleSend}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.navy },
  container: { flexGrow: 1 },
  inner: {
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: { alignSelf: 'flex-start' },
  headingWrap: { gap: Spacing.xs },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  section: { gap: Spacing.sm },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  delayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  delayChip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
    alignItems: 'center',
    minWidth: 70,
  },
  delayChipActive: {
    backgroundColor: Colors.goldSoft,
    borderColor: Colors.gold,
  },
  delayChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  delayChipTextActive: { color: Colors.gold },

  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
  },

  preview: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
    gap: 6,
  },
  previewLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Success
  successOuter: {
    flex: 1,
    backgroundColor: Colors.navy,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  successContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  tick: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.greenBg,
    borderWidth: 2,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: {
    fontSize: 32,
    color: Colors.green,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  successSub: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})