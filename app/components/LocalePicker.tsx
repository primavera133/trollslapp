import React, { useState } from 'react'
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, Modal, Pressable,
} from 'react-native'
import type { Locale } from '../services/db'

interface Props {
  locales: Locale[]
  selected: Locale | null
  onSelect: (locale: Locale) => void
  localeType: 'province' | 'municipality'
  onLocaleTypeChange: (type: 'province' | 'municipality') => void
}

export function LocalePicker({ locales, selected, onSelect, localeType, onLocaleTypeChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? locales.filter(l => l.name.toLowerCase().includes(query.toLowerCase()))
    : locales

  return (
    <>
      {/* Type toggle */}
      <View style={styles.toggle}>
        {(['province', 'municipality'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.toggleBtn, localeType === type && styles.toggleBtnActive]}
            onPress={() => onLocaleTypeChange(type)}
          >
            <Text style={[styles.toggleText, localeType === type && styles.toggleTextActive]}>
              {type === 'province' ? 'Landskap' : 'Kommun'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Picker trigger */}
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.triggerText : styles.triggerPlaceholder}>
          {selected?.name ?? 'Välj plats...'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Modal list */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {localeType === 'province' ? 'Välj landskap' : 'Välj kommun'}
            </Text>
            <Pressable onPress={() => { setOpen(false); setQuery('') }}>
              <Text style={styles.closeBtn}>Stäng</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            placeholder="Sök..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            clearButtonMode="while-editing"
          />

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, selected?.id === item.id && styles.rowSelected]}
                onPress={() => { onSelect(item); setOpen(false); setQuery('') }}
              >
                <Text style={[styles.rowText, selected?.id === item.id && styles.rowTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  toggleBtnActive: {
    backgroundColor: '#023e8a',
  },
  toggleText: {
    fontSize: 14,
    color: '#444',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  triggerText: { flex: 1, fontSize: 15, color: '#111' },
  triggerPlaceholder: { flex: 1, fontSize: 15, color: '#aaa' },
  chevron: { fontSize: 20, color: '#aaa' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  closeBtn: { fontSize: 15, color: '#023e8a' },
  search: {
    margin: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    fontSize: 15,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  rowSelected: { backgroundColor: '#eef4ff' },
  rowText: { fontSize: 15, color: '#111' },
  rowTextSelected: { color: '#023e8a', fontWeight: '600' },
})
