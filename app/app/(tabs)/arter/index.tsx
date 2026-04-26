import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  queryTaxonGroups, queryAllTaxa,
  isDbPopulated,
  type Species,
} from '../../../services/db'
import { SpeciesList } from '../../../components/SpeciesList'

export default function ArterIndexScreen() {
  const [allTaxa, setAllTaxa] = useState<Species[]>([])
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    const populated = isDbPopulated()
    setDbReady(populated)
    if (!populated) return

    const grps = queryTaxonGroups()
    if (grps.length > 0) {
      setAllTaxa(queryAllTaxa(grps[0].id))
    }
  }, [])

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SpeciesList allTaxa={allTaxa} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%', alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
})
