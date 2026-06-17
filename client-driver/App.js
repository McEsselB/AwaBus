import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import Toast from 'react-native-toast-message'
import { Colors } from './constants/theme'
import { getStoredUser } from './services/auth'

import AnimatedSplash   from './app/SplashScreen'
import LoginScreen      from './app/auth/LoginScreen'
import DashboardScreen  from './app/trip/DashboardScreen'
import ActiveTripScreen from './app/trip/ActiveTripScreen'
import DelayBroadcastScreen from './app/trip/DelayBroadcastScreen'

// Keep the native splash visible while we load
SplashScreen.preventAutoHideAsync()

export default function App() {
  const [screen, setScreen]   = useState('splash')
  const [user, setUser]       = useState(null)
  const [trip, setTrip]       = useState(null)
  const [students, setStudents] = useState([])
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    async function prepare() {
      try {
        const stored = await getStoredUser()
        if (stored) setUser(stored)
      } catch {}
      setAppReady(true)
      await SplashScreen.hideAsync()
    }
    prepare()
  }, [])

  // Splash finishes → go to login or dashboard
  function handleSplashDone() {
    setScreen(user ? 'dashboard' : 'login')
  }

  function handleLogin(loggedInUser) {
    setUser(loggedInUser)
    setScreen('dashboard')
  }

  function handleLogout() {
    setUser(null)
    setTrip(null)
    setStudents([])
    setScreen('login')
  }

  function handleTripStart(newTrip, routeStudents) {
    setTrip(newTrip)
    setStudents(routeStudents)
    setScreen('active-trip')
  }

  function handleTripEnd() {
    setTrip(null)
    setStudents([])
    setScreen('dashboard')
  }

  if (!appReady) return null

  return (
    <View style={styles.root}>
      {screen === 'splash' && (
        <AnimatedSplash onFinish={handleSplashDone} />
      )}

      {screen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {screen === 'dashboard' && (
        <DashboardScreen
          user={user}
          onTripStart={handleTripStart}
          onLogout={handleLogout}
        />
      )}

      {screen === 'active-trip' && (
        <ActiveTripScreen
          trip={trip}
          initialStudents={students}
          onTripEnd={handleTripEnd}
          onBroadcast={() => setScreen('broadcast')}
        />
      )}

      {screen === 'broadcast' && (
        <DelayBroadcastScreen
          trip={trip}
          onBack={() => setScreen('active-trip')}
        />
      )}

      <Toast />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navy },
})