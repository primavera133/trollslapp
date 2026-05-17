import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";

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
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !mapRef.current) return;

    const L = require("leaflet");

    if (leafletMap.current) {
      leafletMap.current.remove();
    }

    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { draggable: true }).addTo(
      map,
    );
    markerRef.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng);
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const height = Math.round(width * 1.0);

  return (
    <View
      style={[styles.container, { width, height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Karta som visar din position. Dra markören för att justera."
    >
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%", borderRadius: 12 }}
        aria-hidden="true"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e8e8e8",
  },
});
