import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
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

export default function TermsScreen() {
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
          Användarvillkor
        </Text>
        <Text style={styles.updated}>Senast uppdaterad: 2026-05-13</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allmänt</Text>
          <Text style={styles.body}>
            Genom att använda Trollslapp-appen godkänner du dessa
            användarvillkor. Appen tillhandahålls i befintligt skick utan
            garantier.
          </Text>

          <Text style={styles.sectionTitle}>Användning</Text>
          <Text style={styles.body}>
            Appen är avsedd för att utforska observationer av trollsländor i
            Sverige. Du får använda appen för personligt, icke-kommersiellt bruk.
          </Text>

          <Text style={styles.sectionTitle}>Data och innehåll</Text>
          <Text style={styles.body}>
            Observationsdata och artinformation tillhandahålls av SLU
            Artdatabanken vid Sveriges lantbruksuniversitet (SLU) via deras öppna
            API:er. Genom att använda denna app förbinder du dig att följa SLU
            Artdatabankens regler för användning av information, inklusive
            respekt för tredje parts upphovsrätt. Fullständiga villkor finns på
            slu.se/artdatabanken.
          </Text>

          <Text style={styles.sectionTitle}>Kartdata</Text>
          <Text style={styles.body}>
            Kartbilder tillhandahålls av OpenStreetMap-bidragsgivare under Open
            Data Commons Open Database License (ODbL).
          </Text>

          <Text style={styles.sectionTitle}>Ansvarsbegränsning</Text>
          <Text style={styles.body}>
            Vi ansvarar inte för datas riktighet eller fullständighet.
            Observationsdata kan innehålla felaktigheter och bör inte användas
            som enda källa för vetenskapliga eller juridiska bedömningar.
          </Text>

          <Text style={styles.sectionTitle}>Ändringar</Text>
          <Text style={styles.body}>
            Vi förbehåller oss rätten att ändra dessa villkor. Fortsatt
            användning av appen efter ändringar innebär att du godkänner de nya
            villkoren.
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
    marginBottom: 4,
  },
  updated: { fontSize: 12, color: "#767676", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#023e8a",
    marginTop: 16,
    marginBottom: 4,
  },
  body: { fontSize: 14, color: "#333", lineHeight: 20 },
});
