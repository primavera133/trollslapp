import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, useWindowDimensions,
  StyleSheet, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  queryTaxonGroups, queryAllTaxa,
  isDbPopulated, makeGroupAllSentinel, GROUP_ALL_ID,
  querySpeciesInfo, queryGridCells,
  type TaxonGroup, type Species,
  type SpeciesInfoData, type GridCellData,
} from '../../services/db'
import { SpeciesPicker } from '../../components/SpeciesPicker'
import { SpeciesInfoCard } from '../../components/SpeciesInfoCard'
import { DistributionMap } from '../../components/DistributionMap'

export default function ArterScreen() {
  const { width } = useWindowDimensions()
  const initialized = useRef(false)

  const [groups, setGroups] = useState<TaxonGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<TaxonGroup | null>(null)
  const [allTaxa, setAllTaxa] = useState<Species[]>([])
  const [selection, setSelection] = useState<Species | null>(null)

  const [info, setInfo] = useState<SpeciesInfoData | null>(null)
  const [gridCells, setGridCells] = useState<GridCellData[]>([])

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
      return
    }
    if (selection.rank !== 'species' && selection.rank !== 'subspecies') {
      setInfo(null)
      setGridCells([])
      return
    }
    setInfo(querySpeciesInfo(selection.id))
    setGridCells(queryGridCells(selection.id))
  }, [selection])

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
  noData: { padding: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  noDataText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
})
