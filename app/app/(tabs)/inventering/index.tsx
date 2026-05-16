import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, Platform, useWindowDimensions,
  BackHandler,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import Ionicons from '@expo/vector-icons/Ionicons'
import { querySpeciesNearLocation } from '../../../services/inventory'
import { queryTaxonGroups, queryAllTaxa, isDbPopulated, type Species } from '../../../services/db'
import {
  saveReport, formatReportText, type SavedReport,
} from '../../../services/inventoryStorage'
import { CountdownTimer } from '../../../components/CountdownTimer'
import { CounterRow } from '../../../components/CounterRow'
import { LocationMap } from '../../../components/LocationMap'
import * as Clipboard from 'expo-clipboard'

interface ChecklistEntry {
  species: Species
  count: number
}

type Step = 1 | 2 | 3 | 4 | 5

const DURATION_MS = 15 * 60 * 1000

export default function InventeringScreen() {
  const { width: screenWidth } = useWindowDimensions()
  const mapWidth = Math.min(screenWidth - 32, 700 - 32)

  const [step, setStepRaw] = useState<Step>(1)
  const stepRef = useRef<Step>(1)

  const goForward = useCallback((newStep: Step) => {
    stepRef.current = newStep
    setStepRaw(newStep)
    if (Platform.OS === 'web') {
      window.history.pushState({ step: newStep }, '')
    }
  }, [])

  const goBack = useCallback(() => {
    if (Platform.OS === 'web') {
      window.history.back()
    } else {
      const prev = (stepRef.current - 1) as Step
      if (prev >= 1) {
        stepRef.current = prev
        setStepRaw(prev)
      }
    }
  }, [])

  const resetToStart = useCallback(() => {
    if (Platform.OS === 'web') {
      const stepsBack = stepRef.current - 1
      if (stepsBack > 0) window.history.go(-stepsBack)
    }
    stepRef.current = 1
    setStepRaw(1)
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handlePopState = (e: PopStateEvent) => {
        if (stepRef.current === 4) {
          window.history.pushState({ step: 4 }, '')
          window.history.pushState({ step: 4, guard: true }, '')
          setShowCancelConfirm(true)
          return
        }
        const prevStep = e.state?.step ?? 1
        stepRef.current = prevStep
        setStepRaw(prevStep)
      }
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }

    const handleBack = () => {
      const current = stepRef.current
      if (current === 4) {
        handleBackFromTimer()
        return true
      }
      if (current > 1) {
        const prev = (current - 1) as Step
        stepRef.current = prev
        setStepRaw(prev)
        return true
      }
      return false
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack)
    return () => sub.remove()
  }, [])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [latitude, setLatitude] = useState(0)
  const [longitude, setLongitude] = useState(0)
  const [checklist, setChecklist] = useState<ChecklistEntry[]>([])
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [startTimeStr, setStartTimeStr] = useState('')
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null)
  const [addSpeciesOpen, setAddSpeciesOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const allSpeciesRef = useRef<Species[]>([])

  const handleStart = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setErrorMsg('Platsåtkomst nekades. Du kan starta en inventering utan förifylld artlista.')
        setLatitude(59.3293)
        setLongitude(18.0686)
        setChecklist([])
        goForward(2)
        setLoading(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setLatitude(location.coords.latitude)
      setLongitude(location.coords.longitude)
      goForward(2)
    } catch {
      setErrorMsg('Kunde inte hämta position. Försök igen.')
    }

    setLoading(false)
  }, [])

  const handleLocationNext = useCallback(() => {
    const species = querySpeciesNearLocation(latitude, longitude)
    setChecklist(species.map(s => ({ species: s, count: 0 })))

    const grps = queryTaxonGroups()
    if (grps.length > 0) {
      allSpeciesRef.current = queryAllTaxa(grps[0].id)
    }

    goForward(3)
  }, [latitude, longitude])

  const handleRemoveSpecies = useCallback((id: number) => {
    setChecklist(prev => prev.filter(e => e.species.id !== id))
  }, [])

  const handleAddSpecies = useCallback((species: Species) => {
    setChecklist(prev => {
      if (prev.some(e => e.species.id === species.id)) return prev
      return [...prev, { species, count: 0 }]
    })
    setAddSpeciesOpen(false)
    setSearchQuery('')
  }, [])

  const handleStartTimer = useCallback(() => {
    const now = new Date()
    setStartTimeStr(now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
    setEndTime(new Date(now.getTime() + DURATION_MS))
    goForward(4)
    if (Platform.OS === 'web') {
      window.history.pushState({ step: 4, guard: true }, '')
    }
  }, [])

  const handleIncrement = useCallback((id: number) => {
    setChecklist(prev => prev.map(e =>
      e.species.id === id ? { ...e, count: e.count + 1 } : e
    ))
  }, [])

  const handleDecrement = useCallback((id: number) => {
    setChecklist(prev => prev.map(e =>
      e.species.id === id && e.count > 0 ? { ...e, count: e.count - 1 } : e
    ))
  }, [])

  const handleTimerComplete = useCallback(async () => {
    const now = new Date()
    const endStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString('sv-SE')

    const report: SavedReport = {
      id: now.toISOString(),
      date: dateStr,
      startTime: startTimeStr,
      endTime: endStr,
      latitude,
      longitude,
      entries: checklist.map(e => ({
        speciesId: e.species.id,
        swedish: e.species.swedish,
        scientific: e.species.scientific,
        count: e.count,
      })),
    }

    await saveReport(report)
    setSavedReport(report)
    goForward(5)
  }, [checklist, latitude, longitude, startTimeStr])

  const handleBackFromTimer = useCallback(() => {
    if (Platform.OS === 'web') {
      setShowCancelConfirm(true)
    } else {
      Alert.alert(
        'Avbryt inventering?',
        'All data från denna inventering kommer att förloras.',
        [
          { text: 'Fortsätt', style: 'cancel' },
          { text: 'Avbryt', style: 'destructive', onPress: resetToStart },
        ],
      )
    }
  }, [])

  const handleNewInventory = useCallback(() => {
    resetToStart()
    setLatitude(0)
    setLongitude(0)
    setChecklist([])
    setEndTime(null)
    setStartTimeStr('')
    setSavedReport(null)
    setErrorMsg(null)
    setCopied(false)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!savedReport) return
    const text = formatReportText(savedReport)
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text)
    } else {
      await Clipboard.setStringAsync(text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [savedReport])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const checklistIds = new Set(checklist.map(e => e.species.id))
    return allSpeciesRef.current
      .filter(s =>
        (s.rank === 'species' || s.rank === 'subspecies') &&
        !checklistIds.has(s.id) &&
        ((s.swedish?.toLowerCase().includes(q)) || s.scientific.toLowerCase().includes(q))
      )
  }, [searchQuery, checklist])

  const sortedChecklist = useMemo(() => {
    const withCount = checklist.filter(e => e.count > 0).sort((a, b) => b.count - a.count)
    const withoutCount = checklist.filter(e => e.count === 0)
    return [...withCount, ...withoutCount]
  }, [checklist])

  if (!isDbPopulated()) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ingen data tillgänglig</Text>
          <Text style={styles.emptyBody}>
            Anslut till internet för att hämta observationsdata.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Step 1: Start
  if (step === 1) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading} accessibilityRole="header">Inventering</Text>
          <Text style={styles.subheading}>Trollsländeinventering</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Standardiserad inventering</Text>
            <Text style={styles.cardBody}>
              Genomför en 15-minuters inventering av trollsländor. Din GPS-position
              används för att föreslå vilka arter som kan förekomma i ditt område.
            </Text>
          </View>

          {errorMsg && (
            <View style={styles.errorCard}>
              <Ionicons name="warning-outline" size={20} color="#c1121f" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Starta ny inventering</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Step 2: Location
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
          >
            <Ionicons name="chevron-back" size={20} color="#023e8a" />
            <Text style={styles.backText}>Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>Steg 2 av 5</Text>
          <Text style={styles.heading} accessibilityRole="header">Välj plats</Text>
          <Text style={styles.cardBody}>
            Dra markören för att justera positionen.
          </Text>

          <View style={{ marginVertical: 16 }}>
            <LocationMap
              latitude={latitude}
              longitude={longitude}
              onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
              width={mapWidth}
            />
          </View>

          <View style={styles.coordsRow}>
            <Text style={styles.coordsLabel}>Position:</Text>
            <Text style={styles.coordsValue}>
              {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLocationNext}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Nästa</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Step 3: Species list
  if (step === 3) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backRow}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
          >
            <Ionicons name="chevron-back" size={20} color="#023e8a" />
            <Text style={styles.backText}>Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>Steg 3 av 5</Text>
          <Text style={styles.heading} accessibilityRole="header">Artlista</Text>
          <Text style={styles.cardBody}>
            {checklist.length} arter hittades i ditt område. Ta bort eller lägg till arter innan du startar.
          </Text>

          {checklist.length === 0 && (
            <View style={styles.emptyListCard}>
              <Text style={styles.emptyListText}>
                Inga arter hittades i ditt område. Lägg till arter manuellt.
              </Text>
            </View>
          )}

          {checklist.map(entry => (
            <View key={entry.species.id} style={styles.speciesListRow}>
              <View style={styles.speciesListName}>
                <Text style={styles.speciesName} numberOfLines={1}>
                  {entry.species.swedish ?? entry.species.scientific}
                </Text>
                {entry.species.swedish && (
                  <Text style={styles.speciesSci} numberOfLines={1}>
                    {entry.species.scientific}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveSpecies(entry.species.id)}
                accessibilityLabel={`Ta bort ${entry.species.swedish ?? entry.species.scientific}`}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color="#c1121f" />
              </TouchableOpacity>
            </View>
          ))}

          {addSpeciesOpen ? (
            <View style={styles.addSpeciesContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Sök art..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                clearButtonMode="while-editing"
                returnKeyType="done"
              />
              {searchQuery.trim().length > 0 && (
                <ScrollView
                  style={styles.searchResults}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {searchResults.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.searchResultRow}
                      onPress={() => handleAddSpecies(s)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.speciesName}>{s.swedish ?? s.scientific}</Text>
                      {s.swedish && <Text style={styles.speciesSci}>{s.scientific}</Text>}
                    </TouchableOpacity>
                  ))}
                  {searchResults.length === 0 && (
                    <Text style={styles.noResults}>Inga träffar</Text>
                  )}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => { setAddSpeciesOpen(false); setSearchQuery('') }}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Stäng</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setAddSpeciesOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={20} color="#023e8a" />
              <Text style={styles.secondaryButtonText}>Lägg till art</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartTimer}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Starta inventering</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Step 4: Timer + counts
  if (step === 4 && endTime) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.timerScreen}>
          <Text style={[styles.stepLabel, { paddingHorizontal: 16, paddingTop: 8 }]}>Steg 4 av 5</Text>

          <View style={{ paddingHorizontal: 16 }}>
            <CountdownTimer endTime={endTime} onComplete={handleTimerComplete} />
          </View>

          <FlatList
            data={sortedChecklist}
            keyExtractor={item => String(item.species.id)}
            renderItem={({ item }) => (
              <CounterRow
                species={item.species}
                count={item.count}
                onIncrement={() => handleIncrement(item.species.id)}
                onDecrement={() => handleDecrement(item.species.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              addSpeciesOpen ? (
                <View style={styles.addSpeciesContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Sök art..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    clearButtonMode="while-editing"
                    returnKeyType="done"
                  />
                  {searchQuery.trim().length > 0 && (
                    <ScrollView
                      style={styles.searchResults}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {searchResults.map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.searchResultRow}
                          onPress={() => handleAddSpecies(s)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.speciesName}>{s.swedish ?? s.scientific}</Text>
                          {s.swedish && <Text style={styles.speciesSci}>{s.scientific}</Text>}
                        </TouchableOpacity>
                      ))}
                      {searchResults.length === 0 && (
                        <Text style={styles.noResults}>Inga träffar</Text>
                      )}
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => { setAddSpeciesOpen(false); setSearchQuery('') }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryButtonText}>Stäng</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginHorizontal: 0 }]}
                  onPress={() => setAddSpeciesOpen(true)}
                  accessibilityRole="button"
                >
                  <Ionicons name="add-circle-outline" size={20} color="#023e8a" />
                  <Text style={styles.secondaryButtonText}>Lägg till art</Text>
                </TouchableOpacity>
              )
            }
          />
        </View>

        <Modal
          visible={showCancelConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCancelConfirm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Avbryt inventering?</Text>
              <Text style={styles.modalBody}>All data från denna inventering kommer att förloras.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setShowCancelConfirm(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Fortsätt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonDestructive}
                  onPress={() => { setShowCancelConfirm(false); resetToStart() }}
                >
                  <Text style={styles.modalButtonDestructiveText}>Avbryt</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    )
  }

  // Step 5: Report
  if (step === 5 && savedReport) {
    const observed = savedReport.entries.filter(e => e.count > 0)
    const totalSpecies = observed.length
    const totalIndividuals = observed.reduce((sum, e) => sum + e.count, 0)

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.stepLabel}>Steg 5 av 5</Text>
          <Text style={styles.heading} accessibilityRole="header">Rapport</Text>

          <View style={styles.reportCard}>
            <Text style={styles.reportMeta}>
              {savedReport.date} {savedReport.startTime}–{savedReport.endTime}
            </Text>
            <Text style={styles.reportMeta}>
              {savedReport.latitude.toFixed(4)}°N, {savedReport.longitude.toFixed(4)}°E
            </Text>

            <View style={styles.reportDivider} />

            {observed.length > 0 ? (
              observed.map(entry => (
                <View key={entry.speciesId} style={styles.reportRow}>
                  <Text style={styles.reportSpecies} numberOfLines={1}>
                    {entry.swedish ?? entry.scientific}
                  </Text>
                  <Text style={styles.reportCount}>{entry.count}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyListText}>Inga arter observerade.</Text>
            )}

            <View style={styles.reportDivider} />
            <Text style={styles.reportTotal}>
              Totalt: {totalSpecies} arter, {totalIndividuals} individer
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCopy}
            accessibilityRole="button"
          >
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color="#023e8a" />
            <Text style={styles.secondaryButtonText}>
              {copied ? 'Kopierad!' : 'Kopiera rapport'}
            </Text>
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={20} color="#717171" />
            <Text style={styles.noteText}>
              Rapportering till Artportalen kommer snart.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNewInventory}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Ny inventering</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#717171', textAlign: 'center', lineHeight: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 4 },
  subheading: { fontSize: 15, color: '#666', marginBottom: 16 },
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 8, minHeight: 44,
  },
  backText: { fontSize: 15, color: '#023e8a', fontWeight: '500' },
  stepLabel: {
    fontSize: 12, fontWeight: '600', color: '#023e8a',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#eee',
  },
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: '#023e8a',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  cardBody: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 12 },
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 8, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: '#c1121f', lineHeight: 18 },
  primaryButton: {
    backgroundColor: '#023e8a', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderColor: '#023e8a', borderRadius: 12,
    paddingVertical: 12, marginVertical: 8,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: '#023e8a' },
  coordsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#eee',
  },
  coordsLabel: { fontSize: 13, color: '#717171' },
  coordsValue: { fontSize: 14, fontWeight: '600', color: '#111' },
  speciesListRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: '#eee',
  },
  speciesListName: { flex: 1, marginRight: 8 },
  speciesName: { fontSize: 15, color: '#111' },
  speciesSci: { fontSize: 12, color: '#717171', fontStyle: 'italic', marginTop: 2 },
  removeButton: { padding: 4 },
  addSpeciesContainer: { marginVertical: 8 },
  searchInput: {
    borderWidth: 1, borderColor: '#023e8a', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', fontSize: 15, color: '#111',
  },
  searchResults: {
    maxHeight: 200, borderWidth: 1, borderTopWidth: 0,
    borderColor: '#ddd', borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8, backgroundColor: '#fff',
  },
  searchResultRow: {
    paddingHorizontal: 12, paddingVertical: 12, minHeight: 44,
    justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee',
  },
  noResults: { padding: 12, color: '#767676', fontStyle: 'italic', fontSize: 13 },
  emptyListCard: {
    backgroundColor: '#fff', borderRadius: 8, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#eee',
  },
  emptyListText: { fontSize: 14, color: '#717171', fontStyle: 'italic' },
  timerScreen: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  reportCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#eee',
  },
  reportMeta: { fontSize: 14, color: '#444', lineHeight: 22 },
  reportDivider: {
    height: 1, backgroundColor: '#eee', marginVertical: 12,
  },
  reportRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
  },
  reportSpecies: { flex: 1, fontSize: 15, color: '#111', marginRight: 12 },
  reportCount: { fontSize: 16, fontWeight: '700', color: '#023e8a', minWidth: 32, textAlign: 'right' },
  reportTotal: { fontSize: 15, fontWeight: '700', color: '#111' },
  noteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12,
    marginVertical: 8,
  },
  noteText: { flex: 1, fontSize: 13, color: '#717171', lineHeight: 18 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 24,
    width: 300, maxWidth: '90%',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#111', marginBottom: 8 },
  modalBody: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButtonCancel: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  modalButtonCancelText: { fontSize: 15, fontWeight: '600', color: '#023e8a' },
  modalButtonDestructive: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#d32f2f',
  },
  modalButtonDestructiveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
})
