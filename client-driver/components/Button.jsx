import { Pressable, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native'
import { useRef } from 'react'
import { Colors, FontSize, Radius, Spacing } from '../constants/theme'

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
}) {
  const scale = useRef(new Animated.Value(1)).current

  function onPressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start()
  }

  const isDisabled = disabled || loading

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          styles[variant],
          styles[size],
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'gold' ? Colors.navy : Colors.gold}
            size="small"
          />
        ) : (
          <>
            {icon}
            <Text style={[styles.label, styles[`label_${variant}`], styles[`label_${size}`]]}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
  },
  disabled: { opacity: 0.45 },

  // Variants
  primary: {
    backgroundColor: Colors.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.navyBorder,
  },
  danger: {
    backgroundColor: Colors.redBg,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  dark: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.navyBorder,
  },

  // Sizes
  sm: { paddingVertical: 10, paddingHorizontal: 16 },
  md: { paddingVertical: 14, paddingHorizontal: 24 },
  lg: { paddingVertical: 18, paddingHorizontal: 32 },
  full: { paddingVertical: 18, paddingHorizontal: 32, width: '100%' },

  // Labels
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  label_primary: { color: Colors.navy },
  label_ghost:   { color: Colors.textSecondary },
  label_danger:  { color: Colors.red },
  label_dark:    { color: Colors.textPrimary },

  label_sm:   { fontSize: FontSize.sm },
  label_md:   { fontSize: FontSize.md },
  label_lg:   { fontSize: FontSize.lg },
  label_full: { fontSize: FontSize.lg },
})