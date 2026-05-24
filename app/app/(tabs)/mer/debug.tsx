import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(d: Date | undefined): string {
  if (!d) return "–";
  return d.toLocaleString("sv-SE");
}

export default function DebugScreen() {
  const appVersion = Constants.expoConfig?.version ?? "–";
  const runtimeVersion =
    typeof Constants.expoConfig?.runtimeVersion === "string"
      ? Constants.expoConfig.runtimeVersion
      : Constants.expoConfig?.runtimeVersion?.policy ?? "–";
  const sdkVersion = Constants.expoConfig?.sdkVersion ?? "–";
  const updateId = Updates.updateId ?? "–";
  const channel = Updates.channel ?? "–";
  const createdAt = formatDate(Updates.createdAt);
  const isEmbedded = Updates.isEmbeddedLaunch;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Tillbaka"
        >
          <Ionicons name="chevron-back" size={20} color="#023e8a" />
          <Text style={styles.backText}>Mer</Text>
        </TouchableOpacity>

        <Text style={styles.heading} accessibilityRole="header">
          Debug
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>App</Text>
          <Row label="Version" value={appVersion} />
          <Row label="Expo SDK" value={sdkVersion} />
          <Row label="Runtime version" value={runtimeVersion} />
          <Row label="Plattform" value={Platform.OS} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Expo Update</Text>
          <Row label="Kanal" value={channel} />
          <Row label="Update ID" value={updateId} />
          <Row label="Skapad" value={createdAt} />
          <Row label="Inbäddad" value={isEmbedded ? "Ja" : "Nej"} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: "100%" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    minHeight: 44,
  },
  backText: { fontSize: 15, color: "#023e8a", fontWeight: "500" },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#023e8a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  label: { fontSize: 14, color: "#717171" },
  value: { fontSize: 14, color: "#111", fontWeight: "500", flexShrink: 1, textAlign: "right" },
});
