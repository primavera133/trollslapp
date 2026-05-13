import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const heroImage = require("../../assets/hero.jpg");

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(width - 32, 700 - 32);
  const imageHeight = imageWidth * (850 / 1900);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.title} accessibilityRole="header">
            Trollslapp
          </Text>
          <Text style={styles.subtitle}>Trollsländor i Sverige</Text>
        </View>

        <Image
          source={heroImage}
          style={[styles.heroImage, { width: imageWidth, height: imageHeight }]}
          accessibilityLabel="Sydlig mosaikslända i flykt"
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            Om appen
          </Text>
          <Text style={styles.cardBody}>
            Trollslapp är en app om trollsländor i Sverige. Här kan du se
            utbredningskartor och fenologidata , baserat på observationer från
            Artdatabanken. Du kan filtrera på art, släkte eller familj och se
            hur flygperioden varierar mellan år och platser.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            Fenologi
          </Text>
          <Text style={styles.cardBody}>
            När flyger en art i just ditt landskap eller kommun? Gå till fliken{" "}
            <Text style={styles.bold}>Fenologi</Text> för att utforska
            observationsdata. Välj en art eller ett högre taxon och filtrera på
            plats för att se flygperioden som ett histogram.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            Utbredningskartor och artbeskrivningar
          </Text>
          <Text style={styles.cardBody}>
            Under arter hittar du utbredningskartor som visar var
            observationerna är gjorda. Texter från Artfakta beskriver arterna.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            Data
          </Text>
          <Text style={styles.cardBody}>
            All observationsdata hämtas från SLU Artdatabankens öppna API och
            uppdateras regelbundet.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: "100%" },
  hero: { marginBottom: 16, marginTop: 8 },
  heroImage: { borderRadius: 12, marginBottom: 16, resizeMode: "cover" },
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
