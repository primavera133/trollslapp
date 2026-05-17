import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LarverScreen() {
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
          Nycklar till larver
        </Text>

        <View style={styles.card}>
          <Text style={styles.body}>
            Interaktiva bestämningsnycklar för trollsländelarver från Artfakta.
            Nycklarna hjälper dig att identifiera larver av svenska
            trollsländearter steg för steg.
          </Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              Linking.openURL(
                "https://artfakta.se/artnycklar/579168a0-deaf-4978-9dd3-977a5e7cf922",
              )
            }
            accessibilityRole="link"
          >
            <Ionicons name="open-outline" size={20} color="#023e8a" />
            <Text style={styles.linkText}>Nyckeln på svenska</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              Linking.openURL("https://artfakta.se/artnycklar/32368")
            }
            accessibilityRole="link"
          >
            <Ionicons name="open-outline" size={20} color="#023e8a" />
            <Text style={styles.linkText}>Identification key in English</Text>
          </TouchableOpacity>
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
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    minHeight: 44,
  },
  linkText: {
    fontSize: 15,
    color: "#023e8a",
    fontWeight: "500",
  },
});
