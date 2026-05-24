import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  queryTaxonGroups,
  queryAllTaxa,
  isDbPopulated,
  type Species,
} from "../../../services/db";
import { SpeciesList } from "../../../components/SpeciesList";

const HERO_URI =
  "https://res.cloudinary.com/dragonflies/image/upload/v1753723149/albums/Calopteryx%20virgo/calopteryx-virgo_29347012768_o_f91pqw.jpg";

export default function ArterIndexScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = Math.min(screenWidth - 32, 700 - 32);
  const imageHeight = Math.round(imageWidth * 0.5);
  const [allTaxa, setAllTaxa] = useState<Species[]>([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const populated = isDbPopulated();
    setDbReady(populated);
    if (!populated) return;

    const grps = queryTaxonGroups();
    if (grps.length > 0) {
      setAllTaxa(queryAllTaxa(grps[0].id));
    }
  }, []);

  if (!dbReady) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ingen data tillgänglig</Text>
          <Text style={styles.emptyBody}>
            Anslut till internet för att hämta observationsdata.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading} accessibilityRole="header">
          Arter
        </Text>
        <Text style={styles.ingress}>
          Utforska Sveriges trollsländor. Sök på art, släkte eller familj för
          att se utbredningskartor och artbeskrivningar.
        </Text>

        <Image
          source={{ uri: HERO_URI }}
          style={[styles.heroImage, { width: imageWidth, height: imageHeight }]}
          accessibilityLabel="Blå jungfruslända (Calopteryx virgo)"
        />

        <SpeciesList allTaxa={allTaxa} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: "100%" },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#023e8a",
    marginBottom: 6,
  },
  ingress: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    marginBottom: 16,
  },
  heroImage: {
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: "cover",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: "#717171",
    textAlign: "center",
    lineHeight: 20,
  },
});
