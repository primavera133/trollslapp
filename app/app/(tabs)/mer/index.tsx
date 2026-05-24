import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
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

const MENU_ITEMS_1: {
  href: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    href: "/(tabs)/mer/listor",
    title: "Listor",
    icon: "people-outline",
  },
  {
    href: "/(tabs)/mer/rapporter",
    title: "Sparade rapporter",
    icon: "document-text-outline",
  },
  {
    href: "/(tabs)/mer/larver",
    title: "Nycklar till larver",
    icon: "key-outline",
  },
  {
    href: "/(tabs)/mer/foreningen",
    title: "Trollsländeföreningen",
    icon: "globe-outline",
  },
];

const MENU_ITEMS_2: {
  href: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    href: "/(tabs)/mer/privacy",
    title: "Integritetspolicy",
    icon: "shield-checkmark-outline",
  },
  {
    href: "/(tabs)/mer/terms",
    title: "Användarvillkor",
    icon: "document-text-outline",
  },
  {
    href: "/(tabs)/mer/contact",
    title: "Kontakt",
    icon: "mail-outline",
  },
  {
    href: "/(tabs)/mer/debug",
    title: "Debug",
    icon: "bug-outline",
  },
];

export default function MerIndexScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading} accessibilityRole="header">
          Andra funktioner
        </Text>
        <View style={styles.menu}>
          {MENU_ITEMS_1.map((item) => (
            <Link key={item.href} href={item.href as any} asChild>
              <TouchableOpacity
                style={styles.menuItem}
                accessibilityRole={Platform.OS === "web" ? "link" : "button"}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color="#023e8a"
                  accessibilityElementsHidden
                />
                <Text style={styles.menuText}>{item.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#aaa"
                  accessibilityElementsHidden
                />
              </TouchableOpacity>
            </Link>
          ))}
        </View>
        <Text style={styles.heading} accessibilityRole="header">
          Övrigt
        </Text>
        <View style={styles.menu}>
          {MENU_ITEMS_2.map((item) => (
            <Link key={item.href} href={item.href as any} asChild>
              <TouchableOpacity
                style={styles.menuItem}
                accessibilityRole={Platform.OS === "web" ? "link" : "button"}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color="#023e8a"
                  accessibilityElementsHidden
                />
                <Text style={styles.menuText}>{item.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#aaa"
                  accessibilityElementsHidden
                />
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: "100%" },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  menu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
  },
});
