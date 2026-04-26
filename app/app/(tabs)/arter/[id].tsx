import React, { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, useWindowDimensions,
  StyleSheet, TouchableOpacity, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Link } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  queryTaxonGroups, queryAllTaxa,
  querySpeciesInfo, queryGridCells,
  queryPhenology, queryPhenologyYear, queryAvailableYears,
  type Species, type SpeciesInfoData, type GridCellData, type WeekCount,
} from '../../../services/db'
import { SpeciesInfoCard } from '../../../components/SpeciesInfoCard'
import { DistributionMap } from '../../../components/DistributionMap'
import { Histogram } from '../../../components/Histogram'

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const taxonId = Number(id)
  const { width } = useWindowDimensions()

  const sortedSpecies = useMemo(() => {
    const grps = queryTaxonGroups()
    if (grps.length === 0) return []
    return queryAllTaxa(grps[0].id)
      .filter(t => t.rank === 'species' || t.rank === 'subspecies')
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }, [])

  const currentIndex = sortedSpecies.findIndex(s => s.id === taxonId)
  const species = currentIndex >= 0 ? sortedSpecies[currentIndex] : null
  const prev = currentIndex > 0 ? sortedSpecies[currentIndex - 1] : null
  const next = currentIndex < sortedSpecies.length - 1 ? sortedSpecies[currentIndex + 1] : null

  const [info, setInfo] = useState<SpeciesInfoData | null>(null)
  const [gridCells, setGridCells] = useState<GridCellData[]>([])
  const [allYears, setAllYears] = useState<WeekCount[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [yearData, setYearData] = useState<WeekCount[]>([])

  useEffect(() => {
    if (!species) return
    setInfo(querySpeciesInfo(species.id))
    setGridCells(queryGridCells(species.id))
    setAllYears(queryPhenology(species.id, null))
    setAvailableYears(queryAvailableYears(species.id, null))
    setSelectedYear(null)
    setYearData([])
  }, [species?.id])

  useEffect(() => {
    if (!selectedYear || !species) {
      setYearData([])
      return
    }
    setYearData(queryPhenologyYear(species.id, null, selectedYear))
  }, [selectedYear, species?.id])

  if (!species) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Art hittades inte</Text>
        </View>
      </SafeAreaView>
    )
  }

  const mapWidth = Math.min(width - 32, 700 - 32)

  function navigateTo(s: Species) {
    router.replace(`/(tabs)/arter/${s.id}`)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header with back + species name */}
        <View style={styles.header}>
          {Platform.OS === 'web' ? (
            <Link href="/(tabs)/arter" style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#023e8a" />
            </Link>
          ) : (
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#023e8a" />
            </TouchableOpacity>
          )}
          <View style={styles.headerText}>
            <Text style={styles.title}>{species.swedish ?? species.scientific}</Text>
            {species.swedish && (
              <Text style={styles.subtitle}>{species.scientific}</Text>
            )}
          </View>
        </View>

        {/* Species info */}
        <View style={styles.section}>
          <SpeciesInfoCard species={species} info={info} />
        </View>

        {/* Distribution map */}
        {gridCells.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Utbredning</Text>
            <DistributionMap gridCells={gridCells} width={mapWidth} />
          </View>
        )}

        {/* Phenology histogram */}
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

        {/* Prev / Next navigation */}
        <View style={styles.nav}>
          {prev ? (
            Platform.OS === 'web' ? (
              <Link href={`/(tabs)/arter/${prev.id}`} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={16} color="#023e8a" />
                <Text style={styles.navText} numberOfLines={1}>
                  {prev.swedish ?? prev.scientific}
                </Text>
              </Link>
            ) : (
              <TouchableOpacity style={styles.navBtn} onPress={() => navigateTo(prev)}>
                <Ionicons name="chevron-back" size={16} color="#023e8a" />
                <Text style={styles.navText} numberOfLines={1}>
                  {prev.swedish ?? prev.scientific}
                </Text>
              </TouchableOpacity>
            )
          ) : <View />}
          {next ? (
            Platform.OS === 'web' ? (
              <Link href={`/(tabs)/arter/${next.id}`} style={styles.navBtnRight}>
                <Text style={styles.navText} numberOfLines={1}>
                  {next.swedish ?? next.scientific}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#023e8a" />
              </Link>
            ) : (
              <TouchableOpacity style={styles.navBtnRight} onPress={() => navigateTo(next)}>
                <Text style={styles.navText} numberOfLines={1}>
                  {next.swedish ?? next.scientific}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#023e8a" />
              </TouchableOpacity>
            )
          ) : <View />}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', fontStyle: 'italic', marginTop: 2 },
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
  nav: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 16,
    borderTopWidth: 1, borderColor: '#e0e0e0',
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '45%' },
  navBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '45%' },
  navText: { fontSize: 14, color: '#023e8a', fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
})
