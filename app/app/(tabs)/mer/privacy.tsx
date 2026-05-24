import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyScreen() {
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
          Integritetspolicy
        </Text>
        <Text style={styles.updated}>Senast uppdaterad: 2026-05-24</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Översikt</Text>
          <Text style={styles.body}>
            Trollslapp är en app för att utforska observationer av trollsländor
            i Sverige. Vi värnar om din integritet och samlar in så lite data
            som möjligt.
          </Text>

          <Text style={styles.sectionTitle}>Data vi samlar in</Text>
          <Text style={styles.body}>
            Appen samlar inte in några personuppgifter. Vi använder inga
            inloggningar, konton eller spårningstekniker. Inga cookies används
            för spårning.
          </Text>

          <Text style={styles.sectionTitle}>Platsdata</Text>
          <Text style={styles.body}>
            Inventeringsfunktionen använder din enhets GPS för att bestämma din
            position. Positionen används för att föreslå arter i ditt område
            och sparas lokalt i inventeringsrapporten på din enhet. Din position
            skickas inte till oss.
          </Text>
          <Text style={styles.body}>
            Vid inventering skickas din position till OpenStreetMaps
            Nominatim-tjänst för att slå upp kommunnamn, samt till Open-Meteo
            för att hämta aktuellt väder. Dessa förfrågningar omfattas av
            respektive tjänsts integritetspolicy.
          </Text>

          <Text style={styles.sectionTitle}>Datakällor</Text>
          <Text style={styles.body}>
            All observationsdata hämtas från SLU Artdatabankens öppna API
            (Sveriges lantbruksuniversitet) och visas i bearbetad form. Appen
            lagrar data lokalt på din enhet för offlineanvändning.
          </Text>

          <Text style={styles.sectionTitle}>Lokal lagring</Text>
          <Text style={styles.body}>
            Appen sparar observationsdata lokalt på din enhet för att möjliggöra
            offlineanvändning. Inventeringsrapporter med position, väderdata,
            artobservationer och kommentarer sparas också lokalt på din enhet.
            Ingen data skickas från din enhet till oss.
          </Text>

          <Text style={styles.sectionTitle}>Tredjepartstjänster</Text>
          <Text style={styles.body}>
            Kartvisningen använder OpenStreetMap-kartbilder. Vid kartvisning
            hämtas kartrutor från OpenStreetMaps servrar, som omfattas av deras
            integritetspolicy.
          </Text>
          <Text style={styles.body}>
            Vid inventering kontaktas även Open-Meteo (väderdata) och
            OpenStreetMap Nominatim (ortnamn). Din GPS-position skickas till
            dessa tjänster för att hämta relevant information.
          </Text>

          <Text style={styles.sectionTitle}>Ändringar</Text>
          <Text style={styles.body}>
            Vi kan komma att uppdatera denna integritetspolicy. Eventuella
            ändringar publiceras i appen.
          </Text>

          <Text style={styles.sectionTitle}>Kontakt</Text>
          <Text style={styles.body}>
            Om du har frågor om integritetspolicyn kan du kontakta oss via
            kontaktsidan i appen.
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
