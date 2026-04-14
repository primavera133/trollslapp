import React, { useState } from 'react'
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, Modal, Pressable,
} from 'react-native'
import type { TaxonGroup, Species } from '../services/db'

interface Props {
  groups: TaxonGroup[]
  selectedGroup: TaxonGroup | null
  onGroupSelect: (group: TaxonGroup) => void
  species: Species[]
  selectedSpecies: Species | null
  onSpeciesSelect: (species: Species) => void
}

export function SpeciesPicker({
  groups, selectedGroup, onGroupSelect,
  species, selectedSpecies, onSpeciesSelect,
}: Props) {
  const [groupOpen, setGroupOpen] = useState(false)
  const [speciesOpen, setSpeciesOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredSpecies = query.trim()
    ? species.filter(s =>
        s.swedish?.toLowerCase().includes(query.toLowerCase()) ||
        s.scientific.toLowerCase().includes(query.toLowerCase())
      )
    : species

  return (
    <>
      {/* Group picker — shown as inline chips if few groups, modal otherwise */}
      {groups.length <= 5 ? (
        <View style={styles.chips}>
          {groups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, selectedGroup?.id === g.id && styles.chipActive]}
              onPress={() => onGroupSelect(g)}
            >
              <Text style={[styles.chipText, selectedGroup?.id === g.id && styles.chipTextActive]}>
                {g.swedish ?? g.scientific}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity style={styles.trigger} onPress={() => setGroupOpen(true)}>
          <Text style={selectedGroup ? styles.triggerText : styles.triggerPlaceholder}>
            {selectedGroup?.swedish ?? selectedGroup?.scientific ?? 'Välj grupp...'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* Species picker trigger */}
      <TouchableOpacity
        style={[styles.trigger, !selectedGroup && styles.triggerDisabled]}
        onPress={() => selectedGroup && setSpeciesOpen(true)}
      >
        <Text style={selectedSpecies ? styles.triggerText : styles.triggerPlaceholder}>
          {selectedSpecies
            ? (selectedSpecies.swedish ?? selectedSpecies.scientific)
            : selectedGroup
              ? 'Välj art...'
              : 'Välj grupp först'}
        </Text>
        {selectedSpecies && (
          <Text style={styles.scientific} numberOfLines={1}>
            {selectedSpecies.scientific}
          </Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Group modal (only shown when many groups) */}
      <Modal visible={groupOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Välj artgrupp</Text>
            <Pressable onPress={() => setGroupOpen(false)}>
              <Text style={styles.closeBtn}>Stäng</Text>
            </Pressable>
          </View>
          <FlatList
            data={groups}
            keyExtractor={g => String(g.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, selectedGroup?.id === item.id && styles.rowSelected]}
                onPress={() => { onGroupSelect(item); setGroupOpen(false) }}
              >
                <Text style={[styles.rowText, selectedGroup?.id === item.id && styles.rowTextSelected]}>
                  {item.swedish ?? item.scientific}
                </Text>
                <Text style={styles.rowSub}>{item.scientific}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Species modal */}
      <Modal visible={speciesOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Välj art</Text>
            <Pressable onPress={() => { setSpeciesOpen(false); setQuery('') }}>
              <Text style={styles.closeBtn}>Stäng</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            placeholder="Sök på svenska eller latinskt namn..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            clearButtonMode="while-editing"
          />

          <FlatList
            data={filteredSpecies}
            keyExtractor={s => String(s.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, selectedSpecies?.id === item.id && styles.rowSelected]}
                onPress={() => { onSpeciesSelect(item); setSpeciesOpen(false); setQuery('') }}
              >
                <Text style={[styles.rowText, selectedSpecies?.id === item.id && styles.rowTextSelected]}>
                  {item.swedish ?? item.scientific}
                </Text>
                <Text style={styles.rowSub}>{item.scientific}</Text>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  chipActive: { backgroundColor: '#023e8a', borderColor: '#023e8a' },
  chipText: { fontSize: 14, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  triggerDisabled: { backgroundColor: '#fafafa', opacity: 0.6 },
  triggerText: { flex: 1, fontSize: 15, color: '#111' },
  triggerPlaceholder: { flex: 1, fontSize: 15, color: '#aaa' },
  scientific: { fontSize: 12, color: '#888', fontStyle: 'italic', marginRight: 4 },
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  rowSelected: { backgroundColor: '#eef4ff' },
  rowText: { fontSize: 15, color: '#111' },
  rowTextSelected: { color: '#023e8a', fontWeight: '600' },
  rowSub: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 1 },
})
