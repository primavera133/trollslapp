import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sommarlagerImg = require("../../../assets/sommarlager.jpg");
const ASPECT_RATIO = 408 / 755;

export default function ForeningenScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = Math.min(screenWidth - 32, 700 - 32);
  const imageHeight = imageWidth * ASPECT_RATIO;

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
          Trollsländeföreningen
        </Text>

        <Image
          source={sommarlagerImg}
          style={[styles.image, { width: imageWidth, height: imageHeight }]}
          accessibilityLabel="Foto från Trollsländeföreningens sommarlager"
        />

        <View style={styles.card}>
          <Text style={styles.body}>
            <p>
              Svenska Trollsländeföreningen är en ideell förening för alla som
              är intresserade av trollsländor i Sverige, oavsett kunskapsnivå.
              Föreningen arbetar för att öka kunskapen om trollsländor och deras
              livsmiljöer.
            </p>
            <p>
              Trollsländeföreningen är ansluten till Sveriges Entomologiska
              Förening.
            </p>
            <p>På föreningens hemsida kan du läsa mer om dess aktiviteter.</p>
          </Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              Linking.openURL("https://www.trollslandeforeningen.se/")
            }
            accessibilityRole="link"
          >
            <Ionicons name="open-outline" size={20} color="#023e8a" />
            <Text style={styles.linkText}>trollslandeforeningen.se</Text>
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
  image: {
    borderRadius: 12,
    marginBottom: 16,
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
