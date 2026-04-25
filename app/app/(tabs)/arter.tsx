import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, useWindowDimensions,
  StyleSheet, Platform, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  queryTaxonGroups, queryAllTaxa,
  isDbPopulated, makeGroupAllSentinel, GROUP_ALL_ID,
  querySpeciesInfo, queryGridCells,
  queryPhenology, queryPhenologyYear, queryAvailableYears,
  type TaxonGroup, type Species,
  type SpeciesInfoData, type GridCellData, type WeekCount,
} from '../../services/db'
import { SpeciesPicker } from '../../components/SpeciesPicker'
import { SpeciesInfoCard } from '../../components/SpeciesInfoCard'
import { DistributionMap } from '../../components/DistributionMap'
import { Histogram } from '../../components/Histogram'

export default function ArterScreen() {
  const { width } = useWindowDimensions()
  const initialized = useRef(false)

  const [groups, setGroups] = useState<TaxonGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<TaxonGroup | null>(null)
  const [allTaxa, setAllTaxa] = useState<Species[]>([])
  const [selection, setSelection] = useState<Species | null>(null)

  const [info, setInfo] = useState<SpeciesInfoData | null>(null)
  const [gridCells, setGridCells] = useState<GridCellData[]>([])

  const [allYears, setAllYears] = useState<WeekCount[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [yearData, setYearData] = useState<WeekCount[]>([])

  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    const populated = isDbPopulated()
    setDbReady(populated)
    if (!populated) return

    const grps = queryTaxonGroups()
    setGroups(grps)

    const urlParams = Platform.OS === 'web' ? new URLSearchParams(window.location.search) : null
    const urlTaxon = urlParams?.get('taxon')

    if (grps.length > 0) {
      setSelectedGroup(grps[0])
      const taxa = queryAllTaxa(grps[0].id)
      setAllTaxa(taxa)

      if (urlTaxon) {
        const taxonId = Number(urlTaxon)
        const found = taxa.find(t => t.id === taxonId)
        if (found) setSelection(found)
      }
    }

    initialized.current = true
  }, [])

  const groupChangedByUser = useRef(false)
  useEffect(() => {
    if (!selectedGroup) return
    if (!groupChangedByUser.current) {
      groupChangedByUser.current = true
      return
    }
    setAllTaxa(queryAllTaxa(selectedGroup.id))
    setSelection(null)
  }, [selectedGroup])

  useEffect(() => {
    if (!selection || selection.id === GROUP_ALL_ID) {
      setInfo(null)
      setGridCells([])
      setAllYears([])
      setAvailableYears([])
      setSelectedYear(null)
      setYearData([])
      return
    }
    if (selection.rank !== 'species' && selection.rank !== 'subspecies') {
      setInfo(null)
      setGridCells([])
      setAllYears([])
      setAvailableYears([])
      setSelectedYear(null)
      setYearData([])
      return
    }
    setInfo(querySpeciesInfo(selection.id))
    setGridCells(queryGridCells(selection.id))
    setAllYears(queryPhenology(selection.id, null))
    setAvailableYears(queryAvailableYears(selection.id, null))
    setSelectedYear(null)
    setYearData([])
  }, [selection])

  useEffect(() => {
    if (!selectedYear || !selection || selection.id === GROUP_ALL_ID) {
      setYearData([])
      return
    }
    setYearData(queryPhenologyYear(selection.id, null, selectedYear))
  }, [selectedYear, selection])

  // URL sync
  useEffect(() => {
    if (!initialized.current || Platform.OS !== 'web') return
    const url = new URL(window.location.href)
    url.search = ''
    if (selection && selection.id !== GROUP_ALL_ID) url.searchParams.set('taxon', String(selection.id))
    window.history.replaceState(null, '', url.toString())
  }, [selection])

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

  const mapWidth = width - 32

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>Art</Text>
          <SpeciesPicker
            groups={groups}
            selectedGroup={selectedGroup}
            onGroupSelect={g => { setSelectedGroup(g); setSelection(null) }}
            allTaxa={allTaxa.filter(t => t.rank === 'species' || t.rank === 'subspecies')}
            selection={selection}
            onSelect={setSelection}
          />
        </View>

        {selection && selection.id !== GROUP_ALL_ID && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Artinformation</Text>
              <SpeciesInfoCard species={selection} info={info} />
            </View>

            {gridCells.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Utbredning</Text>
                <DistributionMap gridCells={gridCells} width={mapWidth} />
              </View>
            )}

            {allYears.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Fenologi</Text>
                <Histogram
                  allYears={allYears}
                  selectedYear={selectedYear ? yearData : null}
                  width={mapWidth}
                />
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
              </View>
            )}
          </>
        )}

        {!selection && (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>Välj en art för att se information och utbredning.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  label: {
    fontSize: 12, fontWeight: '600', color: '#555',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 12, color: '#555' },
  yearRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'nowrap' },
  yearBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
  },
  yearBtnActive: { backgroundColor: '#023e8a', borderColor: '#023e8a' },
  yearBtnText: { fontSize: 12, color: '#444' },
  yearBtnTextActive: { color: '#fff', fontWeight: '600' },
  noData: { padding: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  noDataText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
})
