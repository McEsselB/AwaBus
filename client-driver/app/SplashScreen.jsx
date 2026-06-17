import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native'
import { Colors, FontSize, Spacing } from '../constants/theme'

const { width } = Dimensions.get('window')

export default function AnimatedSplash({ onFinish }) {
  const dotScale   = useRef(new Animated.Value(0)).current
  const dotOpacity = useRef(new Animated.Value(0)).current
  const nameOpacity  = useRef(new Animated.Value(0)).current
  const nameSlide    = useRef(new Animated.Value(20)).current
  const tagOpacity   = useRef(new Animated.Value(0)).current
  const ringScale    = useRef(new Animated.Value(0.6)).current
  const ringOpacity  = useRef(new Animated.Value(0)).current
  const exitOpacity  = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      // 1. Ring pulse in
      Animated.parallel([
        Animated.spring(ringScale,   { toValue: 1,   useNativeDriver: true, speed: 3, bounciness: 8 }),
        Animated.timing(ringOpacity, { toValue: 0.15, duration: 500, useNativeDriver: true }),
      ]),
      // 2. Gold dot appears
      Animated.parallel([
        Animated.spring(dotScale,   { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 10 }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // 3. Brand name slides in
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(nameSlide,   { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // 4. Tagline fades in
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // 5. Hold
      Animated.delay(900),
      // 6. Fade out everything
      Animated.timing(exitOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => onFinish())
  }, [])

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      {/* Outer decorative ring */}
      <Animated.View style={[
        styles.ring,
        { transform: [{ scale: ringScale }], opacity: ringOpacity }
      ]} />

      {/* Gold dot */}
      <Animated.View style={[
        styles.dot,
        { transform: [{ scale: dotScale }], opacity: dotOpacity }
      ]} />

      {/* Brand name */}
      <Animated.Text style={[
        styles.brand,
        { opacity: nameOpacity, transform: [{ translateY: nameSlide }] }
      ]}>
        AwaBus
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        Driver Portal
      </Animated.Text>

      {/* Bottom copy */}
      <Animated.Text style={[styles.sub, { opacity: tagOpacity }]}>
        Keeping Ghanaian children safe,{'\n'}one proximity alert at a time.
      </Animated.Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 40,
    borderColor: Colors.gold,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gold,
    marginBottom: Spacing.md,
  },
  brand: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.gold,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.xxl,
  },
  sub: {
    position: 'absolute',
    bottom: Spacing.xxl,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
})