import React, { useMemo, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  width: number;
}

export function LocationMap({
  latitude,
  longitude,
  onLocationChange,
  width,
}: Props) {
  const height = Math.round(width * 1.0);
  const callbackRef = useRef(onLocationChange);
  callbackRef.current = onLocationChange;

  const html = useMemo(() => {
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
var map = L.map('map').setView([${latitude},${longitude}],10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OSM',maxZoom:18
}).addTo(map);
var marker = L.marker([${latitude},${longitude}],{draggable:true}).addTo(map);
marker.on('dragend',function(){
  var pos = marker.getLatLng();
  window.ReactNativeWebView.postMessage(JSON.stringify({lat:pos.lat,lng:pos.lng}));
});
</script>
</body>
</html>`;
  }, [latitude, longitude]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const { lat, lng } = JSON.parse(event.nativeEvent.data);
        callbackRef.current(lat, lng);
      } catch {}
    },
    [],
  );

  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        scrollEnabled={false}
        javaScriptEnabled
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
});
