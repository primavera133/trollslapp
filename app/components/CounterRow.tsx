import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Species } from '../services/db'

interface Props {
  species: Species
  count: number
  onIncrement: () => void
  onDecrement: () => void
}

export function CounterRow({ species, count, onIncrement, onDecrement }: Props) {
  const name = species.swedish ?? species.scientific

  return (
    <View style={styles.row}>
      <View style={styles.nameContainer}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {species.swedish && (
          <Text style={styles.scientific} numberOfLines={1}>{species.scientific}</Text>
        )}
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, count === 0 && styles.buttonDisabled]}
          onPress={onDecrement}
          disabled={count === 0}
          accessibilityLabel={`Minska antal ${name}`}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, count === 0 && styles.buttonTextDisabled]}>−</Text>
        </TouchableOpacity>
        <Text style={styles.count} accessibilityLabel={`${count} observationer`}>{count}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onIncrement}
          accessibilityLabel={`Öka antal ${name}`}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    color: '#111',
  },
  scientific: {
    fontSize: 12,
    color: '#717171',
    fontStyle: 'italic',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#023e8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ddd',
  },
  buttonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 28,
  },
  buttonTextDisabled: {
    color: '#999',
  },
  count: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    minWidth: 32,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
})
