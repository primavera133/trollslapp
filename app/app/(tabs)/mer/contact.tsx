import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ContactScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {Platform.OS !== "web" && (
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
          >
            <Ionicons name="chevron-back" size={20} color="#023e8a" />
            <Text style={styles.backText}>Mer</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.heading} accessibilityRole="header">
          Kontakt
        </Text>

        <View style={styles.card}>
          <Text style={styles.body}>
            Har du frågor, synpunkter eller vill rapportera ett problem?
            Kontakta oss gärna.
          </Text>

          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("mailto:jonas.myrenas@gmail.com")}
            accessibilityRole="link"
            accessibilityLabel="Skicka e-post till jonas.myrenas@gmail.com"
          >
            <Ionicons name="mail-outline" size={20} color="#023e8a" />
            <Text style={styles.contactText}>jonas.myrenas@gmail.com</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Om appen</Text>
          <Text style={styles.body}>
            Trollslapp är en app för att utforska observationer av trollsländor
            i Sverige. Appen siktar på att publiceras för såväl iOS som Android
            samt på webben. Data tillhandahålls av Artdatabanken vid SLU.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    borderWidth: 1,
    borderColor: "#eee",
  },
  body: { fontSize: 14, color: "#333", lineHeight: 20 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    minHeight: 44,
  },
  contactText: {
    fontSize: 15,
    color: "#023e8a",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#023e8a",
    marginBottom: 4,
  },
});
