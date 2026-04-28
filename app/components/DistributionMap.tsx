import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import type { GridCellData } from '../services/db'

interface Props {
  gridCells: GridCellData[]
  width: number
}

const COLORS = ['#c7e9c0', '#74c476', '#31a354', '#006d2c', '#00441b']

function getColor(count: number): string {
  if (count <= 1) return COLORS[0]
  if (count <= 5) return COLORS[1]
  if (count <= 20) return COLORS[2]
  if (count <= 100) return COLORS[3]
  return COLORS[4]
}

export function DistributionMap({ gridCells, width }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMap = useRef<any>(null)

  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return

    const L = require('leaflet')

    if (leafletMap.current) {
      leafletMap.current.remove()
    }

    const map = L.map(mapRef.current, {
      center: [62, 16],
      zoom: 4,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    for (const cell of gridCells) {
      const bounds: [[number, number], [number, number]] = [
        [cell.bottomLat, cell.topLng],
        [cell.topLat, cell.bottomLng],
      ]
      L.rectangle(bounds, {
        color: getColor(cell.count),
        weight: 0.5,
        opacity: 0.8,
        fillColor: getColor(cell.count),
        fillOpacity: 0.6,
      }).addTo(map).bindPopup(`${cell.count.toLocaleString()} observationer`)
    }

    // Add legend
    const legend = L.control({ position: 'bottomright' })
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-legend')
      div.style.cssText =
        'background:#fff;padding:8px 10px;border-radius:6px;font-size:11px;line-height:18px;box-shadow:0 1px 4px rgba(0,0,0,.2)'
      const labels = ['1', '2–5', '6–20', '21–100', '100+']
      div.innerHTML = labels
        .map(
          (label, i) =>
            `<span style="display:inline-block;width:14px;height:14px;background:${COLORS[i]};margin-right:4px;vertical-align:middle;border-radius:2px"></span>${label}`,
        )
        .join('<br>')
      return div
    }
    legend.addTo(map)

    // Fit bounds to data if we have cells
    if (gridCells.length > 0) {
      const allBounds = gridCells.map(c => [
        [c.bottomLat, c.topLng],
        [c.topLat, c.bottomLng],
      ]).flat() as [number, number][]
      map.fitBounds(allBounds, { padding: [20, 20] })
    }

    leafletMap.current = map

    return () => {
      map.remove()
      leafletMap.current = null
    }
  }, [gridCells])

  const height = Math.round(width * 1.2)

  return (
    <View
      style={[styles.container, { width, height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Utbredningskarta med ${gridCells.length} rutor som visar var arten observerats i Sverige`}
    >
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}
        aria-hidden="true"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
})
