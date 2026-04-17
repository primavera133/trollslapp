import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { queryLocales, queryTopObservers, isDbPopulated, SWEDEN_LOCALE, type Locale, type TopObserver } from '../../services/db'
import { LocalePicker } from '../../components/LocalePicker'

type LocaleTab = 'sweden' | 'province' | 'municipality'

export default function ObservatorerScreen() {
  const [localeType, setLocaleType] = useState<LocaleTab>('sweden')
  const [locales, setLocales] = useState<Locale[]>([])
  const [selectedLocale, setSelectedLocale] = useState<Locale>(SWEDEN_LOCALE)
  const [observers, setObservers] = useState<TopObserver[]>([])
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    setDbReady(isDbPopulated())
  }, [])

  useEffect(() => {
    if (!dbReady) return
    if (localeType === 'sweden') {
      setLocales([])
      setSelectedLocale(SWEDEN_LOCALE)
    } else {
      setLocales(queryLocales(localeType))
      setSelectedLocale(SWEDEN_LOCALE)
    }
  }, [localeType, dbReady])

  useEffect(() => {
    if (!dbReady) return
    const localeId = selectedLocale.id === SWEDEN_LOCALE.id ? null : selectedLocale.id
    setObservers(queryTopObservers(localeId, 10))
  }, [selectedLocale, dbReady])

  if (!dbReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ingen data tillgänglig</Text>
          <Text style={styles.emptyBody}>Anslut till internet för att hämta observationsdata.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const localeLabel = selectedLocale.id === SWEDEN_LOCALE.id ? 'Sverige' : selectedLocale.name

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>Plats</Text>
          <LocalePicker
            locales={locales}
            selected={selectedLocale.id === SWEDEN_LOCALE.id ? null : selectedLocale}
            onSelect={setSelectedLocale}
            localeType={localeType}
            onLocaleTypeChange={setLocaleType}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Toppobservatörer — {localeLabel}</Text>
          {observers.length === 0 ? (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>Ingen observatörsdata tillgänglig för vald plats.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {observers.map((obs, i) => (
                <View key={obs.name} style={[styles.row, i === 0 && styles.rowFirst]}>
                  <View style={[styles.rankBadge, i < 3 && styles.rankBadgePodium]}>
                    <Text style={[styles.rankText, i < 3 && styles.rankTextPodium]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{obs.name}</Text>
                  <Text style={styles.count}>{obs.speciesCount} sp.</Text>
                </View>
              ))}
            </View>
          )}
        </View>
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
  list: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    gap: 12,
  },
  rowFirst: { borderTopWidth: 0 },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgePodium: { backgroundColor: '#023e8a' },
  rankText: { fontSize: 13, fontWeight: '700', color: '#666' },
  rankTextPodium: { color: '#fff' },
  name: { flex: 1, fontSize: 15, color: '#111' },
  count: { fontSize: 14, color: '#023e8a', fontWeight: '600' },
  noData: { padding: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  noDataText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
})
