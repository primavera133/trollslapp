import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable, ScrollView,
} from 'react-native'
import type { TaxonGroup, Species, TaxonRank } from '../services/db'

const RANK_LABEL: Record<TaxonRank, string> = {
  species: 'art',
  subspecies: 'underart',
  genus: 'släkte',
  family: 'familj',
}

interface Props {
  groups: TaxonGroup[]
  selectedGroup: TaxonGroup | null
  onGroupSelect: (group: TaxonGroup) => void
  allTaxa: Species[]
  selection: Species | null
  onSelect: (taxon: Species) => void
}

export function SpeciesPicker({
  groups, selectedGroup, onGroupSelect,
  allTaxa, selection, onSelect,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<TextInput>(null)

  function handleGroupSelect(g: TaxonGroup) {
    onGroupSelect(g)
    setOpen(false)
    setQuery('')
  }

  function handleSelect(taxon: Species) {
    onSelect(taxon)
    setOpen(false)
    setQuery('')
  }

  const displayed = query.trim()
    ? allTaxa.filter(t =>
        (t.swedish?.toLowerCase().includes(query.toLowerCase())) ||
        t.scientific.toLowerCase().includes(query.toLowerCase())
      )
    : allTaxa

  const selectionLabel = selection
    ? (selection.swedish ?? selection.scientific)
    : null

  return (
    <View>
      {/* Group chips */}
      {groups.length <= 5 ? (
        <View style={styles.chips}>
          {groups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, selectedGroup?.id === g.id && styles.chipActive]}
              onPress={() => handleGroupSelect(g)}
            >
              <Text style={[styles.chipText, selectedGroup?.id === g.id && styles.chipTextActive]}>
                {g.swedish ?? g.scientific}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.groupDropdownWrap}>
          <TextInput
            style={styles.input}
            placeholder="Sök grupp..."
            value={query}
            onChangeText={t => setQuery(t)}
          />
        </View>
      )}

      {/* Taxon trigger + searchable dropdown */}
      {selectedGroup && (
        <>
          {!open && (
            <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
              <Text
                style={selectionLabel ? styles.triggerText : styles.triggerPlaceholder}
                numberOfLines={1}
              >
                {selectionLabel ?? 'Sök familj, släkte eller art...'}
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>
          )}

          {open && (
            <>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Sök familj, släkte eller art..."
                value={query}
                onChangeText={setQuery}
                clearButtonMode="while-editing"
                returnKeyType="done"
                onSubmitEditing={() => { if (displayed.length === 1) handleSelect(displayed[0]) }}
              />
              <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled">
                {displayed.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, selection?.id === item.id && styles.rowSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={styles.rowMain}>
                      <Text
                        style={[styles.rowText, selection?.id === item.id && styles.rowTextSelected]}
                        numberOfLines={1}
                      >
                        {item.swedish ?? item.scientific}
                      </Text>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>{RANK_LABEL[item.rank]}</Text>
                      </View>
                    </View>
                    {(item.rank === 'species' || item.rank === 'subspecies') && item.swedish && (
                      <Text style={styles.rowSub} numberOfLines={1}>{item.scientific}</Text>
                    )}
                  </TouchableOpacity>
                ))}

                {displayed.length === 0 && (
                  <View style={styles.hint}>
                    <Text style={styles.hintText}>Inga träffar</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.closeRow} onPress={() => { setOpen(false); setQuery('') }}>
                  <Text style={styles.closeText}>Stäng</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  chipActive: { backgroundColor: '#023e8a', borderColor: '#023e8a' },
  chipText: { fontSize: 14, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  groupDropdownWrap: { marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: '#fff', fontSize: 15, color: '#111',
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
  chevron: { fontSize: 12, color: '#aaa', marginLeft: 4 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#023e8a',
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#111',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#023e8a',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 320,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  rowSelected: { backgroundColor: '#eef4ff' },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 15, color: '#111', flexShrink: 1 },
  rowTextSelected: { color: '#023e8a', fontWeight: '600' },
  rowSub: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 1 },
  rankBadge: {
    borderRadius: 4, borderWidth: 1, borderColor: '#ccc',
    paddingHorizontal: 5, paddingVertical: 1, backgroundColor: '#f5f5f5',
  },
  rankBadgeText: { fontSize: 10, color: '#777', fontStyle: 'italic' },
  hint: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  hintText: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  closeRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    alignItems: 'flex-end',
  },
  closeText: { fontSize: 13, color: '#023e8a' },
})
