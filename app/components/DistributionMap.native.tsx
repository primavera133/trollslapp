import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
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
  const height = Math.round(width * 1.2)

  const html = useMemo(() => {
    const cellsJson = JSON.stringify(
      gridCells.map(c => ({
        tla: c.topLat, tln: c.topLng,
        bla: c.bottomLat, bln: c.bottomLng,
        c: c.count, color: getColor(c.count),
      })),
    )

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map').setView([62,16],4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OSM',maxZoom:18
}).addTo(map);
var cells = ${cellsJson};
var bounds = [];
cells.forEach(function(c){
  var b = [[c.bla,c.tln],[c.tla,c.bln]];
  bounds.push(b[0],b[1]);
  L.rectangle(b,{color:c.color,weight:0.5,opacity:0.8,fillColor:c.color,fillOpacity:0.6})
    .addTo(map).bindPopup(c.c+' observationer');
});
if(bounds.length>0) map.fitBounds(bounds,{padding:[20,20]});
</script>
</body>
</html>`
  }, [gridCells])

  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        scrollEnabled={false}
        javaScriptEnabled
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
