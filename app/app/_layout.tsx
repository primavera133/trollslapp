import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { syncIfNeeded, registerBackgroundSync, hasLocalDb } from '../services/sync'
import { resetDb } from '../services/db'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Kontrollerar data...')

  useEffect(() => {
    async function init() {
      try {
        const hasDb = await hasLocalDb()

        if (!hasDb) {
          setStatus('Hämtar data (första gången)...')
        }

        const updated = await syncIfNeeded()
        if (updated) {
          resetDb()
          setStatus('Data uppdaterad!')
        }
        await registerBackgroundSync()
      } catch (err) {
        // Offline with no local DB, or background sync not available.
        // Show empty state in UI — app is still usable.
        console.warn('Init error:', err)
      }

      setReady(true)
    }

    init()
  }, [])

  if (!ready) {
    return (
      <SafeAreaView style={styles.splash} accessibilityRole="summary">
        <Text style={styles.title} accessibilityRole="header">Trollslapp</Text>
        <ActivityIndicator style={styles.spinner} color="#023e8a" accessibilityLabel={status} />
        <Text style={styles.status}>{status}</Text>
      </SafeAreaView>
    )
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#023e8a',
    letterSpacing: 1,
  },
  spinner: { marginTop: 8 },
  status: { fontSize: 13, color: '#717171' },
})
