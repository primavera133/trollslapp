import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface Props {
  endTime: Date
  onComplete: () => void
}

export function CountdownTimer({ endTime, onComplete }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endTime.getTime() - Date.now()))
  const completedRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = Math.max(0, endTime.getTime() - Date.now())
      setRemaining(ms)
      if (ms <= 0 && !completedRef.current) {
        completedRef.current = true
        clearInterval(interval)
        onComplete()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [endTime, onComplete])

  const totalSeconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isWarning = remaining < 2 * 60 * 1000 && remaining > 0

  return (
    <View style={[styles.container, isWarning && styles.containerWarning]}>
      <Text style={styles.label}>Tid kvar</Text>
      <Text style={[styles.timer, isWarning && styles.timerWarning]}>{display}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#023e8a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  containerWarning: {
    backgroundColor: '#c1121f',
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 4,
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: '#fff',
  },
})
