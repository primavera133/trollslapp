import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Species, SpeciesInfoData } from "../services/db";

const RED_LIST_COLORS: Record<string, string> = {
  RE: "#000",
  CR: "#d32f2f",
  EN: "#e65100",
  VU: "#f9a825",
  NT: "#aed581",
  DD: "#bbb",
  LC: "#4caf50",
  NA: "#9e9e9e",
  NE: "#9e9e9e",
};

const RED_LIST_LABELS: Record<string, string> = {
  RE: "Nationellt utdöd",
  CR: "Akut hotad",
  EN: "Starkt hotad",
  VU: "Sårbar",
  NT: "Nära hotad",
  DD: "Kunskapsbrist",
  LC: "Livskraftig",
  NA: "Ej tillämplig",
  NE: "Ej bedömd",
};

export function SpeciesInfoCard({
  species,
  info,
}: {
  species: Species;
  info: SpeciesInfoData | null;
}) {
  return (
    <View style={styles.card} accessible accessibilityRole="summary">
      <View style={styles.header}>
        <View style={styles.names}>
          <Text style={styles.swedish} accessibilityRole="header">
            {species.swedish ?? species.scientific}
          </Text>
          <Text style={styles.scientific}>{species.scientific}</Text>
        </View>
        {info?.redListCategory && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  RED_LIST_COLORS[info.redListCategory] ?? "#9e9e9e",
              },
            ]}
            accessibilityLabel={`Rödlistekategori: ${RED_LIST_LABELS[info.redListCategory] ?? info.redListCategory}`}
          >
            <Text style={styles.badgeText}>{info.redListCategory}</Text>
          </View>
        )}
      </View>

      {info?.redListCategory && (
        <Text style={styles.redListLabel}>
          IUCN Status:{" "}
          {RED_LIST_LABELS[info.redListCategory] ?? info.redListCategory}
        </Text>
      )}

      {info?.spreadAndStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Utbredning</Text>
          <Text style={styles.body}>{info.spreadAndStatus}</Text>
        </View>
      )}

      {info?.ecology && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Ekologi</Text>
          <Text style={styles.body}>{info.ecology}</Text>
        </View>
      )}

      {info?.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Kännetecken</Text>
          <Text style={styles.body}>{info.description}</Text>
        </View>
      )}

      {info && (
        <Text style={styles.source}>Källa: Artdatabanken (Artfakta)</Text>
      )}

      {!info && (
        <Text style={styles.noData}>Ingen artinformation tillgänglig.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  names: { flex: 1, marginRight: 12 },
  swedish: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    textTransform: "capitalize",
  },
  scientific: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#666",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  badgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  redListLabel: { fontSize: 12, color: "#717171", marginBottom: 12 },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#023e8a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  body: { fontSize: 14, color: "#333", lineHeight: 20 },
  source: { fontSize: 11, color: "#767676", marginTop: 12 },
  noData: { fontSize: 14, color: "#767676", fontStyle: "italic", marginTop: 8 },
});
