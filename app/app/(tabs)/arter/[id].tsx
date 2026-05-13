import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DistributionMap } from "../../../components/DistributionMap";
import { Histogram, type Foreground } from "../../../components/Histogram";
import { SpeciesInfoCard } from "../../../components/SpeciesInfoCard";
import {
  queryAllTaxa,
  queryAvailableYears,
  queryGridCells,
  queryPhenology,
  queryPhenologyYear,
  querySpeciesInfo,
  queryTaxonGroups,
  type GridCellData,
  type Species,
  type SpeciesInfoData,
  type WeekCount,
} from "../../../services/db";

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taxonId = Number(id);
  const { width } = useWindowDimensions();

  const sortedSpecies = useMemo(() => {
    const grps = queryTaxonGroups();
    if (grps.length === 0) return [];
    return queryAllTaxa(grps[0].id)
      .filter((t) => t.rank === "species" || t.rank === "subspecies")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, []);

  const currentIndex = sortedSpecies.findIndex((s) => s.id === taxonId);
  const species = currentIndex >= 0 ? sortedSpecies[currentIndex] : null;
  const prev = currentIndex > 0 ? sortedSpecies[currentIndex - 1] : null;
  const next =
    currentIndex < sortedSpecies.length - 1
      ? sortedSpecies[currentIndex + 1]
      : null;

  const [info, setInfo] = useState<SpeciesInfoData | null>(null);
  const [gridCells, setGridCells] = useState<GridCellData[]>([]);
  const [allYears, setAllYears] = useState<WeekCount[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearData, setYearData] = useState<WeekCount[]>([]);
  const [foreground, setForeground] = useState<Foreground>("year");

  useEffect(() => {
    if (!species) return;
    setInfo(querySpeciesInfo(species.id));
    setGridCells(queryGridCells(species.id));
    setAllYears(queryPhenology(species.id, null));
    setAvailableYears(queryAvailableYears(species.id, null));
    setSelectedYear(null);
    setYearData([]);
    setForeground("year");
  }, [species?.id]);

  useEffect(() => {
    if (!selectedYear || !species) {
      setYearData([]);
      return;
    }
    setYearData(queryPhenologyYear(species.id, null, selectedYear));
  }, [selectedYear, species?.id]);

  if (!species) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Art hittades inte</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mapWidth = Math.min(width - 32, 700 - 32);

  function navigateTo(s: Species) {
    router.replace(`/(tabs)/arter/${s.id}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Species info with map between header and details */}
        <View style={styles.section}>
          <SpeciesInfoCard species={species} info={info}>
            {gridCells.length > 0 && (
              <View style={styles.mapSection}>
                <DistributionMap gridCells={gridCells} width={mapWidth} />
              </View>
            )}
          </SpeciesInfoCard>
        </View>

        {/* Phenology histogram */}
        {allYears.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label} accessibilityRole="header">
              Fenologi
            </Text>
            <Histogram
              allYears={allYears}
              selectedYear={selectedYear ? yearData : null}
              yearCount={availableYears.length}
              foreground={foreground}
              width={mapWidth}
            />
            <View style={styles.legend}>
              <TouchableOpacity
                style={styles.legendItem}
                onPress={() => selectedYear && setForeground("year")}
                disabled={!selectedYear}
                accessibilityRole="button"
                accessibilityLabel={
                  selectedYear ? `Visa ${selectedYear} i förgrunden` : "Alla år"
                }
              >
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: selectedYear ? "#023e8a" : "#023e8a" },
                  ]}
                />
                <Text
                  style={[
                    styles.legendText,
                    selectedYear &&
                      foreground === "year" &&
                      styles.legendTextActive,
                  ]}
                >
                  {selectedYear ? String(selectedYear) : "Alla år"}
                </Text>
              </TouchableOpacity>
              {selectedYear && (
                <TouchableOpacity
                  style={styles.legendItem}
                  onPress={() => setForeground("average")}
                  accessibilityRole="button"
                  accessibilityLabel="Visa medeltal i förgrunden"
                >
                  <View
                    style={[
                      styles.legendSwatch,
                      { backgroundColor: "#8ecae6" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      foreground === "average" && styles.legendTextActive,
                    ]}
                  >
                    Medeltal alla år
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {availableYears.length > 0 && (
              <View
                style={styles.yearRow}
                accessibilityRole="tablist"
                accessibilityLabel="Välj år"
              >
                <TouchableOpacity
                  style={[
                    styles.yearBtn,
                    !selectedYear && styles.yearBtnActive,
                  ]}
                  onPress={() => {
                    setSelectedYear(null);
                    setForeground("year");
                  }}
                  accessibilityRole="tab"
                  accessibilityLabel="Alla år"
                  accessibilityState={{ selected: !selectedYear }}
                >
                  <Text
                    style={[
                      styles.yearBtnText,
                      !selectedYear && styles.yearBtnTextActive,
                    ]}
                  >
                    Alla
                  </Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.yearRow}>
                    {availableYears.map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[
                          styles.yearBtn,
                          selectedYear === y && styles.yearBtnActive,
                        ]}
                        onPress={() => {
                          setSelectedYear(y === selectedYear ? null : y);
                          setForeground("year");
                        }}
                        accessibilityRole="tab"
                        accessibilityLabel={`År ${y}`}
                        accessibilityState={{ selected: selectedYear === y }}
                      >
                        <Text
                          style={[
                            styles.yearBtnText,
                            selectedYear === y && styles.yearBtnTextActive,
                          ]}
                        >
                          {y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Prev / Next navigation */}
        <View style={styles.nav} accessibilityLabel="Föregående och nästa art">
          {prev ? (
            Platform.OS === "web" ? (
              <Link href={`/(tabs)/arter/${prev.id}`} asChild>
                <TouchableOpacity
                  style={styles.navBtn}
                  accessibilityRole="link"
                  accessibilityLabel={`Föregående: ${prev.swedish ?? prev.scientific}`}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color="#023e8a"
                    accessibilityElementsHidden
                  />
                  <Text style={styles.navText} numberOfLines={1}>
                    {prev.swedish ?? prev.scientific}
                  </Text>
                </TouchableOpacity>
              </Link>
            ) : (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => navigateTo(prev)}
                accessibilityRole="button"
                accessibilityLabel={`Föregående: ${prev.swedish ?? prev.scientific}`}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color="#023e8a"
                  accessibilityElementsHidden
                />
                <Text style={styles.navText} numberOfLines={1}>
                  {prev.swedish ?? prev.scientific}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <View />
          )}
          {next ? (
            Platform.OS === "web" ? (
              <Link href={`/(tabs)/arter/${next.id}`} asChild>
                <TouchableOpacity
                  style={styles.navBtnRight}
                  accessibilityRole="link"
                  accessibilityLabel={`Nästa: ${next.swedish ?? next.scientific}`}
                >
                  <Text style={styles.navText} numberOfLines={1}>
                    {next.swedish ?? next.scientific}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#023e8a"
                    accessibilityElementsHidden
                  />
                </TouchableOpacity>
              </Link>
            ) : (
              <TouchableOpacity
                style={styles.navBtnRight}
                onPress={() => navigateTo(next)}
                accessibilityRole="button"
                accessibilityLabel={`Nästa: ${next.swedish ?? next.scientific}`}
              >
                <Text style={styles.navText} numberOfLines={1}>
                  {next.swedish ?? next.scientific}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#023e8a"
                  accessibilityElementsHidden
                />
              </TouchableOpacity>
            )
          ) : (
            <View />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 14, color: "#666", fontStyle: "italic", marginTop: 2 },
  section: { marginBottom: 20 },
  mapSection: { marginTop: 12 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  legend: { flexDirection: "row", gap: 16, marginTop: 8 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingVertical: 4,
  },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 12, color: "#555" },
  legendTextActive: { fontWeight: "600", color: "#023e8a" },
  yearRow: { flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "nowrap" },
  yearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center" as const,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  yearBtnActive: { backgroundColor: "#023e8a", borderColor: "#023e8a" },
  yearBtnText: { fontSize: 12, color: "#444" },
  yearBtnTextActive: { color: "#fff", fontWeight: "600" },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "48%",
    overflow: "hidden",
  },
  navBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "48%",
    overflow: "hidden",
  },
  navText: {
    fontSize: 13,
    color: "#023e8a",
    fontWeight: "500",
    flexShrink: 1,
    textTransform: "capitalize",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
});
