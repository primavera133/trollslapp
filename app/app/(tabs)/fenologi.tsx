import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { Histogram, type Foreground } from "../../components/Histogram";
import { LocalePicker } from "../../components/LocalePicker";
import { SpeciesPicker } from "../../components/SpeciesPicker";
import {
  GROUP_ALL_ID,
  isDbPopulated,
  makeGroupAllSentinel,
  queryAllTaxa,
  queryAvailableYears,
  queryAvailableYearsByFamily,
  queryAvailableYearsByGenus,
  queryAvailableYearsByGroup,
  queryGeneratedAt,
  queryLocales,
  queryPhenology,
  queryPhenologyByFamily,
  queryPhenologyByGenus,
  queryPhenologyByGroup,
  queryPhenologyYear,
  queryPhenologyYearByFamily,
  queryPhenologyYearByGenus,
  queryPhenologyYearByGroup,
  queryTaxonGroups,
  SWEDEN_LOCALE,
  type Locale,
  type Species,
  type TaxonGroup,
  type WeekCount,
} from "../../services/db";

type LocaleTab = "sweden" | "province" | "municipality";

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const initialized = useRef(false);
  const yearRestoredFromUrl = useRef(false);

  const [localeType, setLocaleType] = useState<LocaleTab>("sweden");
  const [locales, setLocales] = useState<Locale[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(SWEDEN_LOCALE);

  const [groups, setGroups] = useState<TaxonGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TaxonGroup | null>(null);
  const [allTaxa, setAllTaxa] = useState<Species[]>([]);
  const [selection, setSelection] = useState<Species | null>(null);

  const [allYears, setAllYears] = useState<WeekCount[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearData, setYearData] = useState<WeekCount[]>([]);

  const [foreground, setForeground] = useState<"year" | "average">("year");
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const populated = isDbPopulated();
    setDbReady(populated);
    if (!populated) return;
    const grps = queryTaxonGroups();
    setGroups(grps);

    const urlParams =
      Platform.OS === "web"
        ? new URLSearchParams(window.location.search)
        : null;
    const urlLt = urlParams?.get("lt") as LocaleTab | undefined;
    const urlLoc = urlParams?.get("loc");
    const urlTaxon = urlParams?.get("taxon");
    const urlYear = urlParams?.get("year");

    if (grps.length > 0) {
      setSelectedGroup(grps[0]);

      if (urlLt && (urlLt === "province" || urlLt === "municipality")) {
        setLocaleType(urlLt);
        const locs = queryLocales(urlLt);
        setLocales(locs);
        if (urlLoc) {
          const found = locs.find((l) => l.id === urlLoc);
          if (found) setSelectedLocale(found);
        }
      }

      const taxa = queryAllTaxa(grps[0].id);
      setAllTaxa(taxa);

      if (urlTaxon) {
        const taxonId = Number(urlTaxon);
        if (taxonId === GROUP_ALL_ID) {
          setSelection(makeGroupAllSentinel(grps[0]));
        } else {
          const found = taxa.find((t) => t.id === taxonId);
          if (found) setSelection(found);
          else setSelection(makeGroupAllSentinel(grps[0]));
        }
      } else {
        setSelection(makeGroupAllSentinel(grps[0]));
      }

      if (urlYear) {
        setSelectedYear(Number(urlYear));
        yearRestoredFromUrl.current = true;
      }
    }

    initialized.current = true;
  }, []);

  const localeTypeChangedByUser = useRef(false);
  useEffect(() => {
    if (!dbReady) return;
    if (!localeTypeChangedByUser.current) {
      localeTypeChangedByUser.current = true;
      return;
    }
    if (localeType === "sweden") {
      setLocales([]);
      setSelectedLocale(SWEDEN_LOCALE);
    } else {
      setLocales(queryLocales(localeType));
      setSelectedLocale(SWEDEN_LOCALE);
    }
  }, [localeType, dbReady]);

  const groupChangedByUser = useRef(false);
  useEffect(() => {
    if (!selectedGroup) return;
    if (!groupChangedByUser.current) {
      groupChangedByUser.current = true;
      return;
    }
    setAllTaxa(queryAllTaxa(selectedGroup.id));
    setSelection(makeGroupAllSentinel(selectedGroup));
  }, [selectedGroup]);

  // Load histogram whenever selection + locale change
  const loadHistogram = useCallback(() => {
    if (!selection) return;

    const localeId =
      selectedLocale.id === SWEDEN_LOCALE.id ? null : selectedLocale.id;

    if (selection.id === GROUP_ALL_ID) {
      setAllYears(queryPhenologyByGroup(selection.groupId, localeId));
      setAvailableYears(
        queryAvailableYearsByGroup(selection.groupId, localeId),
      );
    } else if (
      selection.rank === "species" ||
      selection.rank === "subspecies"
    ) {
      setAllYears(queryPhenology(selection.id, localeId));
      setAvailableYears(queryAvailableYears(selection.id, localeId));
    } else if (selection.rank === "genus") {
      setAllYears(
        queryPhenologyByGenus(selection.genus, selection.groupId, localeId),
      );
      setAvailableYears(
        queryAvailableYearsByGenus(
          selection.genus,
          selection.groupId,
          localeId,
        ),
      );
    } else if (selection.rank === "family" && selection.family) {
      setAllYears(
        queryPhenologyByFamily(selection.family, selection.groupId, localeId),
      );
      setAvailableYears(
        queryAvailableYearsByFamily(
          selection.family,
          selection.groupId,
          localeId,
        ),
      );
    }
    if (yearRestoredFromUrl.current) {
      yearRestoredFromUrl.current = false;
    } else {
      setSelectedYear(null);
      setYearData([]);
      setForeground("year");
    }
  }, [selection, selectedLocale]);

  useEffect(() => {
    loadHistogram();
  }, [loadHistogram]);

  // Sync state to URL params (web only)
  useEffect(() => {
    if (!initialized.current || Platform.OS !== "web") return;
    const url = new URL(window.location.href);
    url.search = "";
    if (localeType !== "sweden") url.searchParams.set("lt", localeType);
    if (selectedLocale.id !== SWEDEN_LOCALE.id)
      url.searchParams.set("loc", selectedLocale.id);
    if (selection) url.searchParams.set("taxon", String(selection.id));
    if (selectedYear) url.searchParams.set("year", String(selectedYear));
    window.history.replaceState(null, "", url.toString());
  }, [localeType, selectedLocale, selection, selectedYear]);

  useEffect(() => {
    if (!selectedYear || !selection) {
      setYearData([]);
      return;
    }

    const localeId =
      selectedLocale.id === SWEDEN_LOCALE.id ? null : selectedLocale.id;

    if (selection.id === GROUP_ALL_ID) {
      setYearData(
        queryPhenologyYearByGroup(selection.groupId, localeId, selectedYear),
      );
    } else if (
      selection.rank === "species" ||
      selection.rank === "subspecies"
    ) {
      setYearData(queryPhenologyYear(selection.id, localeId, selectedYear));
    } else if (selection.rank === "genus") {
      setYearData(
        queryPhenologyYearByGenus(
          selection.genus,
          selection.groupId,
          localeId,
          selectedYear,
        ),
      );
    } else if (selection.rank === "family" && selection.family) {
      setYearData(
        queryPhenologyYearByFamily(
          selection.family,
          selection.groupId,
          localeId,
          selectedYear,
        ),
      );
    }
  }, [selectedYear, selection, selectedLocale]);

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

  const histogramWidth = Math.min(width - 32, 700 - 32);
  const hasHistogram = allYears.length > 0;

  const histogramTitle = (() => {
    if (!selection) return "";
    return selection.swedish ?? selection.scientific;
  })();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">
            Plats
          </Text>
          <LocalePicker
            locales={locales}
            selected={selectedLocale}
            onSelect={setSelectedLocale}
            localeType={localeType}
            onLocaleTypeChange={(type) => setLocaleType(type)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">
            Art
          </Text>
          <SpeciesPicker
            groups={groups}
            selectedGroup={selectedGroup}
            onGroupSelect={(g) => {
              setSelectedGroup(g);
              setSelection(null);
            }}
            allTaxa={allTaxa}
            selection={selection}
            onSelect={setSelection}
          />
        </View>

        {selection && (
          <View style={styles.section}>
            <Text style={styles.label} accessibilityRole="header">
              Fenologi — {histogramTitle}
            </Text>

            {hasHistogram ? (
              <>
                <Histogram
                  allYears={allYears}
                  selectedYear={selectedYear ? yearData : null}
                  yearCount={availableYears.length}
                  foreground={foreground}
                  width={histogramWidth}
                />

                <View style={styles.legend}>
                  <TouchableOpacity
                    style={styles.legendItem}
                    onPress={() => selectedYear && setForeground("year")}
                    disabled={!selectedYear}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedYear
                        ? `Visa ${selectedYear} i förgrunden`
                        : "Alla år"
                    }
                  >
                    <View
                      style={[
                        styles.legendSwatch,
                        {
                          backgroundColor: selectedYear ? "#023e8a" : "#023e8a",
                        },
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
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
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
                            accessibilityState={{
                              selected: selectedYear === y,
                            }}
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
              </>
            ) : (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>
                  Inga imago-observationer för denna kombination.
                </Text>
              </View>
            )}
          </View>
        )}

        {(() => {
          const gen = queryGeneratedAt();
          if (!gen) return null;
          const d = new Date(gen);
          const formatted = d.toLocaleDateString("sv-SE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          return (
            <Text style={styles.dataInfo}>
              Data hämtad {formatted} från SLU Artdatabankens öppna API.
            </Text>
          );
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: "100%" },
  section: { marginBottom: 20 },
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
  noData: {
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
  },
  noDataText: { color: "#767676", fontSize: 14, textAlign: "center" },
  dataInfo: { fontSize: 12, color: "#767676", marginTop: 24, lineHeight: 18 },
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
