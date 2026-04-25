import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.title}>Trollslapp</Text>
          <Text style={styles.subtitle}>Trollsländor i Sverige</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Om appen</Text>
          <Text style={styles.cardBody}>
            Trollslapp visar fenologidata för trollsländor (Odonata) i Sverige,
            baserat på observationer från Artdatabanken. Du kan filtrera på art,
            släkte eller familj och se hur flygperioden varierar mellan år och
            platser.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kom igång</Text>
          <Text style={styles.cardBody}>
            Gå till fliken <Text style={styles.bold}>Fenologi</Text> för att
            utforska observationsdata. Välj en art eller ett högre taxon och
            filtrera på plats för att se flygperioden som ett histogram.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data</Text>
          <Text style={styles.cardBody}>
            Observationsdata hämtas från Artdatabankens öppna API och uppdateras
            regelbundet. Endast imago-observationer (flygande vuxna individer)
            ingår.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 24, marginTop: 8 },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#023e8a",
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 15, color: "#666", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#023e8a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardBody: { fontSize: 14, color: "#444", lineHeight: 22 },
  bold: { fontWeight: "700", color: "#023e8a" },
});
