import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, useWindowDimensions,
  StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native'
import {
  queryTaxonGroups, querySpecies, queryLocales,
  queryPhenology, queryPhenologyYear, queryAvailableYears,
  isDbPopulated,
  type TaxonGroup, type Species, type Locale, type WeekCount,
} from '../services/db'
import { LocalePicker } from '../components/LocalePicker'
import { SpeciesPicker } from '../components/SpeciesPicker'
import { Histogram } from '../components/Histogram'

export default function HomeScreen() {
  const { width } = useWindowDimensions()

  // Picker state
  const [localeType, setLocaleType] = useState<'province' | 'municipality'>('province')
  const [locales, setLocales] = useState<Locale[]>([])
  const [selectedLocale, setSelectedLocale] = useState<Locale | null>(null)
  const [groups, setGroups] = useState<TaxonGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<TaxonGroup | null>(null)
  const [species, setSpecies] = useState<Species[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)

  // Histogram state
  const [allYears, setAllYears] = useState<WeekCount[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [yearData, setYearData] = useState<WeekCount[]>([])

  const [dbReady, setDbReady] = useState(false)

  // Load static data from DB on mount
  useEffect(() => {
    const populated = isDbPopulated()
    setDbReady(populated)
    if (!populated) return

    setGroups(queryTaxonGroups())
  }, [])

  // Reload locales when type changes
  useEffect(() => {
    if (!dbReady) return
    const data = queryLocales(localeType)
    setLocales(data)
    setSelectedLocale(null)
  }, [localeType, dbReady])

  // Reload species when group changes
  useEffect(() => {
    if (!selectedGroup) return
    setSpecies(querySpecies(selectedGroup.id))
    setSelectedSpecies(null)
  }, [selectedGroup])

  // Reload histogram when species + locale change
  const loadHistogram = useCallback(() => {
    if (!selectedSpecies || !selectedLocale) return
    const phenology = queryPhenology(selectedSpecies.id, selectedLocale.id)
    const years = queryAvailableYears(selectedSpecies.id, selectedLocale.id)
    setAllYears(phenology)
    setAvailableYears(years)
    setSelectedYear(null)
    setYearData([])
  }, [selectedSpecies, selectedLocale])

  useEffect(() => { loadHistogram() }, [loadHistogram])

  // Reload year data when year selection changes
  useEffect(() => {
    if (!selectedYear || !selectedSpecies || !selectedLocale) {
      setYearData([])
      return
    }
    setYearData(queryPhenologyYear(selectedSpecies.id, selectedLocale.id, selectedYear))
  }, [selectedYear, selectedSpecies, selectedLocale])

  if (!dbReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ingen data tillgänglig</Text>
          <Text style={styles.emptyBody}>
            Anslut till internet för att hämta observationsdata.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const histogramWidth = width - 32
  const hasHistogram = allYears.length > 0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Text style={styles.heading}>Trollslapp</Text>
        <Text style={styles.subheading}>Trollsländeobservationer i Sverige</Text>

        {/* Pickers */}
        <View style={styles.section}>
          <Text style={styles.label}>Plats</Text>
          <LocalePicker
            locales={locales}
            selected={selectedLocale}
            onSelect={setSelectedLocale}
            localeType={localeType}
            onLocaleTypeChange={type => {
              setLocaleType(type)
              setSelectedLocale(null)
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Art</Text>
          <SpeciesPicker
            groups={groups}
            selectedGroup={selectedGroup}
            onGroupSelect={g => { setSelectedGroup(g); setSelectedSpecies(null) }}
            species={species}
            selectedSpecies={selectedSpecies}
            onSpeciesSelect={setSelectedSpecies}
          />
        </View>

        {/* Histogram */}
        {selectedSpecies && selectedLocale && (
          <View style={styles.section}>
            <Text style={styles.label}>Fenologi — vecka 1–52</Text>

            {hasHistogram ? (
              <>
                <Histogram
                  allYears={allYears}
                  selectedYear={selectedYear ? yearData : null}
                  width={histogramWidth}
                />

                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: '#8ecae6' }]} />
                    <Text style={styles.legendText}>Alla år</Text>
                  </View>
                  {selectedYear && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendSwatch, { backgroundColor: '#023e8a' }]} />
                      <Text style={styles.legendText}>{selectedYear}</Text>
                    </View>
                  )}
                </View>

                {/* Year selector */}
                {availableYears.length > 0 && (
                  <View style={styles.yearRow}>
                    <TouchableOpacity
                      style={[styles.yearBtn, !selectedYear && styles.yearBtnActive]}
                      onPress={() => setSelectedYear(null)}
                    >
                      <Text style={[styles.yearBtnText, !selectedYear && styles.yearBtnTextActive]}>
                        Alla
                      </Text>
                    </TouchableOpacity>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.yearRow}>
                        {availableYears.map(y => (
                          <TouchableOpacity
                            key={y}
                            style={[styles.yearBtn, selectedYear === y && styles.yearBtnActive]}
                            onPress={() => setSelectedYear(y === selectedYear ? null : y)}
                          >
                            <Text style={[styles.yearBtnText, selectedYear === y && styles.yearBtnTextActive]}>
                              {y}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>
                  Inga imago-observationer för denna kombination.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 40 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#023e8a',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  section: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 12, color: '#555' },
  yearRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'nowrap' },
  yearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  yearBtnActive: { backgroundColor: '#023e8a', borderColor: '#023e8a' },
  yearBtnText: { fontSize: 12, color: '#444' },
  yearBtnTextActive: { color: '#fff', fontWeight: '600' },
  noData: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
  },
  noDataText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
})
