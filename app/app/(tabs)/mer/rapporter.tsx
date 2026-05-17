import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import {
  loadReports, deleteReport, formatReportText,
  type SavedReport,
} from '../../../services/inventoryStorage'
import * as Clipboard from 'expo-clipboard'
import { Platform } from 'react-native'

export default function RapporterScreen() {
  const [reports, setReports] = useState<SavedReport[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadReports().then(setReports)
  }, [])

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      'Ta bort rapport?',
      'Rapporten tas bort permanent.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            await deleteReport(id)
            setReports(prev => prev.filter(r => r.id !== id))
            if (expandedId === id) setExpandedId(null)
          },
        },
      ],
    )
  }, [expandedId])

  const handleCopy = useCallback(async (report: SavedReport) => {
    const text = formatReportText(report)
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text)
    } else {
      await Clipboard.setStringAsync(text)
    }
    setCopiedId(report.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Tillbaka"
        >
          <Ionicons name="arrow-back" size={20} color="#023e8a" />
          <Text style={styles.backText}>Mer</Text>
        </TouchableOpacity>

        <Text style={styles.heading} accessibilityRole="header">
          Inventeringsrapporter
        </Text>

        {reports.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>
              Inga rapporter sparade ännu. Genomför en inventering för att skapa din första rapport.
            </Text>
          </View>
        )}

        {reports.map(report => {
          const observed = report.entries.filter(e => e.count > 0)
          const totalSpecies = observed.length
          const totalIndividuals = observed.reduce((sum, e) => sum + e.count, 0)
          const isExpanded = expandedId === report.id

          return (
            <View key={report.id} style={styles.reportCard}>
              <TouchableOpacity
                style={styles.reportHeader}
                onPress={() => handleToggle(report.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={styles.reportHeaderLeft}>
                  <Text style={styles.reportDate}>{report.date}</Text>
                  <Text style={styles.reportTime}>
                    {report.startTime}–{report.endTime}
                  </Text>
                </View>
                <View style={styles.reportHeaderRight}>
                  <Text style={styles.reportSummary}>
                    {totalSpecies} arter, {totalIndividuals} ind.
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#717171"
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.reportBody}>
                  <Text style={styles.reportCoords}>
                    {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
                  </Text>

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
                    <Text style={styles.emptyText}>Inga arter observerade.</Text>
                  )}

                  <View style={styles.reportActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCopy(report)}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={copiedId === report.id ? 'checkmark' : 'copy-outline'}
                        size={18}
                        color="#023e8a"
                      />
                      <Text style={styles.actionText}>
                        {copiedId === report.id ? 'Kopierad!' : 'Kopiera'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(report.id)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={18} color="#c1121f" />
                      <Text style={[styles.actionText, { color: '#c1121f' }]}>Ta bort</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: '100%' },
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  backText: { fontSize: 15, color: '#023e8a', fontWeight: '500' },
  heading: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 16 },
  emptyCard: {
    alignItems: 'center', padding: 32,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee',
  },
  emptyText: {
    fontSize: 14, color: '#717171', textAlign: 'center', lineHeight: 20, marginTop: 12,
  },
  reportCard: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eee', marginBottom: 10, overflow: 'hidden',
  },
  reportHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  reportHeaderLeft: { gap: 2 },
  reportDate: { fontSize: 15, fontWeight: '600', color: '#111' },
  reportTime: { fontSize: 13, color: '#717171' },
  reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportSummary: { fontSize: 13, color: '#444' },
  reportBody: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderColor: '#f0f0f0',
  },
  reportCoords: { fontSize: 13, color: '#717171', marginTop: 10, marginBottom: 8 },
  reportRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 4,
  },
  reportSpecies: { flex: 1, fontSize: 14, color: '#111', marginRight: 12 },
  reportCount: { fontSize: 14, fontWeight: '700', color: '#023e8a', minWidth: 32, textAlign: 'right' },
  reportActions: {
    flexDirection: 'row', gap: 16, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderColor: '#f0f0f0',
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  actionText: { fontSize: 13, fontWeight: '500', color: '#023e8a' },
})
