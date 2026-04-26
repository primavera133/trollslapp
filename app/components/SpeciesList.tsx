import React, { useState, useMemo, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native'
import { Link, router } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { queryTaxonomyNames, type Species, type TaxonomyNames } from '../services/db'

interface FamilySection {
  family: string
  genera: GenusSection[]
}

interface GenusSection {
  genus: string
  species: Species[]
}

interface Props {
  allTaxa: Species[]
}

export function SpeciesList({ allTaxa }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<TextInput>(null)
  const taxonomyNames = useMemo(() => queryTaxonomyNames(), [])

  const speciesOnly = useMemo(
    () => allTaxa
      .filter(t => t.rank === 'species' || t.rank === 'subspecies')
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allTaxa],
  )

  const sections = useMemo((): FamilySection[] => {
    const familyMap = new Map<string, Map<string, Species[]>>()
    const familyOrder: string[] = []

    for (const s of speciesOnly) {
      const fam = s.family ?? 'Okänd familj'
      if (!familyMap.has(fam)) {
        familyMap.set(fam, new Map())
        familyOrder.push(fam)
      }
      const genusMap = familyMap.get(fam)!
      if (!genusMap.has(s.genus)) genusMap.set(s.genus, [])
      genusMap.get(s.genus)!.push(s)
    }

    return familyOrder.map(fam => ({
      family: fam,
      genera: [...familyMap.get(fam)!.entries()].map(([genus, species]) => ({
        genus,
        species,
      })),
    }))
  }, [speciesOnly])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return speciesOnly.filter(t =>
      (t.swedish?.toLowerCase().includes(q)) ||
      t.scientific.toLowerCase().includes(q),
    )
  }, [query, speciesOnly])

  function navigateTo(s: Species) {
    setSearchOpen(false)
    setQuery('')
    router.push(`/(tabs)/arter/${s.id}`)
  }

  return (
    <View>
      {/* Search toggle */}
      <View style={styles.searchRow}>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => {
            setSearchOpen(!searchOpen)
            if (!searchOpen) setTimeout(() => inputRef.current?.focus(), 100)
            else setQuery('')
          }}
        >
          <Ionicons name="search-outline" size={20} color="#023e8a" />
          <Text style={styles.searchBtnText}>Sök art</Text>
        </TouchableOpacity>
      </View>

      {/* Search input + results */}
      {searchOpen && (
        <View style={styles.searchContainer}>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Sök art..."
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
            returnKeyType="done"
            autoFocus
          />
          {query.trim().length > 0 && (
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map(s => (
                Platform.OS === 'web' ? (
                  <Link key={s.id} href={`/(tabs)/arter/${s.id}`} asChild>
                    <TouchableOpacity style={styles.searchRow2}>
                      <Text style={styles.speciesName}>{s.swedish ?? s.scientific}</Text>
                      {s.swedish && <Text style={styles.sciName}>{s.scientific}</Text>}
                    </TouchableOpacity>
                  </Link>
                ) : (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.searchRow2}
                    onPress={() => navigateTo(s)}
                  >
                    <Text style={styles.speciesName}>{s.swedish ?? s.scientific}</Text>
                    {s.swedish && <Text style={styles.sciName}>{s.scientific}</Text>}
                  </TouchableOpacity>
                )
              ))}
              {searchResults.length === 0 && (
                <Text style={styles.noResults}>Inga träffar</Text>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Taxonomic list */}
      {sections.map(section => (
        <View key={section.family} style={styles.familySection}>
          <Text style={styles.familyHeader}>
            {taxonomyNames.families[section.family]
              ? `${taxonomyNames.families[section.family]} — ${section.family}`
              : section.family}
          </Text>
          {section.genera.map(g => (
            <View key={g.genus}>
              <Text style={styles.genusHeader}>
                {taxonomyNames.genera[g.genus]
                  ? `${taxonomyNames.genera[g.genus]} — ${g.genus}`
                  : g.genus}
              </Text>
              {g.species.map(s => (
                Platform.OS === 'web' ? (
                  <Link key={s.id} href={`/(tabs)/arter/${s.id}`} asChild>
                    <TouchableOpacity style={styles.speciesRow}>
                      <Text style={styles.speciesName}>{s.swedish ?? s.scientific}</Text>
                      {s.swedish && <Text style={styles.sciName}>{s.scientific}</Text>}
                    </TouchableOpacity>
                  </Link>
                ) : (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.speciesRow}
                    onPress={() => router.push(`/(tabs)/arter/${s.id}`)}
                  >
                    <Text style={styles.speciesName}>{s.swedish ?? s.scientific}</Text>
                    {s.swedish && <Text style={styles.sciName}>{s.scientific}</Text>}
                  </TouchableOpacity>
                )
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  searchRow: { marginBottom: 12 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#023e8a',
    backgroundColor: '#fff',
  },
  searchBtnText: { fontSize: 14, color: '#023e8a', fontWeight: '500' },
  searchContainer: { marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#023e8a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#111',
  },
  searchResults: {
    maxHeight: 200,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#ddd',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#fff',
  },
  searchRow2: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  noResults: {
    padding: 12,
    color: '#aaa',
    fontStyle: 'italic',
    fontSize: 13,
  },
  familySection: { marginBottom: 16 },
  familyHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#023e8a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  genusHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 2,
    paddingLeft: 4,
  },
  speciesRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  speciesName: { fontSize: 15, color: '#111', textTransform: 'capitalize' },
  sciName: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 4 },
})
