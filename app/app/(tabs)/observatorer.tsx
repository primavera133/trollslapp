import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocalePicker } from "../../components/LocalePicker";
import {
  isDbPopulated,
  queryGeneratedAt,
  queryLocales,
  queryObserverSpecies,
  queryTopObservers,
  SWEDEN_LOCALE,
  type Locale,
  type ObserverSpecies,
  type TopObserver,
} from "../../services/db";

type LocaleTab = "sweden" | "province" | "municipality";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ObserverRow({
  observer,
  rank,
  localeId,
}: {
  observer: TopObserver;
  rank: number;
  localeId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [species, setSpecies] = useState<ObserverSpecies[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle() {
    if (!expanded && species.length === 0) {
      setLoading(true);
      const rows = queryObserverSpecies(localeId, observer.name);
      setSpecies(rows);
      setLoading(false);
    }
    setExpanded((e) => !e);
  }

  const isPodium = rank <= 3;

  return (
    <View>
      <TouchableOpacity
        style={[styles.row, rank === 1 && styles.rowFirst]}
        onPress={toggle}
      >
        <View style={[styles.rankBadge, isPodium && styles.rankBadgePodium]}>
          <Text style={[styles.rankText, isPodium && styles.rankTextPodium]}>
            {rank}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {observer.name}
        </Text>
        <Text style={styles.count}>{observer.speciesCount} sp.</Text>
        <Text style={styles.chevron}>{expanded ? "▴" : "▾"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detail}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#023e8a"
              style={{ margin: 12 }}
            />
          ) : (
            [...species].reverse().map((sp, idx) => (
              <View key={sp.speciesId} style={styles.speciesRow}>
                <Text style={styles.speciesNum}>{species.length - idx}</Text>
                <View style={styles.speciesNames}>
                  <Text style={styles.speciesSwedish} numberOfLines={1}>
                    {sp.swedishName ?? sp.scientificName}
                  </Text>
                  {sp.swedishName && (
                    <Text style={styles.speciesSci} numberOfLines={1}>
                      {sp.scientificName}
                    </Text>
                  )}
                </View>
                <Text style={styles.speciesDate}>
                  {formatDate(sp.firstDate)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export default function ObservatorerScreen() {
  const initialized = useRef(false);

  const [localeType, setLocaleType] = useState<LocaleTab>("sweden");
  const [locales, setLocales] = useState<Locale[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(SWEDEN_LOCALE);
  const [observers, setObservers] = useState<TopObserver[]>([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const populated = isDbPopulated();
    setDbReady(populated);
    if (!populated) return;

    const urlParams =
      Platform.OS === "web"
        ? new URLSearchParams(window.location.search)
        : null;
    const urlLt = urlParams?.get("lt") as LocaleTab | undefined;
    const urlLoc = urlParams?.get("loc") ?? undefined;

    if (urlLt && (urlLt === "province" || urlLt === "municipality")) {
      setLocaleType(urlLt);
      const locs = queryLocales(urlLt);
      setLocales(locs);
      if (urlLoc) {
        const found = locs.find((l) => l.id === urlLoc);
        if (found) setSelectedLocale(found);
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

  useEffect(() => {
    if (!initialized.current || Platform.OS !== "web") return;
    const url = new URL(window.location.href);
    url.search = "";
    if (localeType !== "sweden") url.searchParams.set("lt", localeType);
    if (selectedLocale.id !== SWEDEN_LOCALE.id)
      url.searchParams.set("loc", selectedLocale.id);
    window.history.replaceState(null, "", url.toString());
  }, [localeType, selectedLocale]);

  useEffect(() => {
    if (!dbReady) return;
    const localeId =
      selectedLocale.id === SWEDEN_LOCALE.id ? null : selectedLocale.id;
    setObservers(queryTopObservers(localeId, 10));
  }, [selectedLocale, dbReady]);

  if (!dbReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Ingen data tillgänglig</Text>
          <Text style={styles.emptyBody}>
            Anslut till internet för att hämta observationsdata.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const localeId =
    selectedLocale.id === SWEDEN_LOCALE.id ? null : selectedLocale.id;
  const localeLabel =
    selectedLocale.id === SWEDEN_LOCALE.id ? "Sverige" : selectedLocale.name;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>Plats</Text>
          <LocalePicker
            locales={locales}
            selected={
              selectedLocale.id === SWEDEN_LOCALE.id ? null : selectedLocale
            }
            onSelect={setSelectedLocale}
            localeType={localeType}
            onLocaleTypeChange={setLocaleType}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Toppobservatörer — {localeLabel}</Text>
          {observers.length === 0 ? (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>
                Ingen observatörsdata tillgänglig för vald plats.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {observers.map((obs, i) => (
                <ObserverRow
                  key={obs.name}
                  observer={obs}
                  rank={i + 1}
                  localeId={localeId}
                />
              ))}
            </View>
          )}
        </View>

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
              Data hämtad {formatted} från Artdatabankens öppna API.
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
  list: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    gap: 12,
  },
  rowFirst: { borderTopWidth: 0 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankBadgePodium: { backgroundColor: "#023e8a" },
  rankText: { fontSize: 13, fontWeight: "700", color: "#666" },
  rankTextPodium: { color: "#fff" },
  name: { flex: 1, fontSize: 15, color: "#111" },
  count: { fontSize: 14, color: "#023e8a", fontWeight: "600", flexShrink: 0 },
  chevron: { fontSize: 11, color: "#aaa", flexShrink: 0 },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    backgroundColor: "#f8f9fa",
  },
  speciesRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    gap: 8,
  },
  speciesNum: {
    width: 28,
    textAlign: "center",
    alignItems: "flex-start",
    fontSize: 12,
    color: "#bbb",
    fontVariant: ["tabular-nums"],
  },
  speciesNames: { flex: 1 },
  speciesSwedish: { fontSize: 14, color: "#111" },
  speciesSci: { fontSize: 12, color: "#888", fontStyle: "italic" },
  speciesDate: { fontSize: 12, color: "#666", flexShrink: 0 },
  noData: {
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  noDataText: { color: "#aaa", fontSize: 14, textAlign: "center" },
  dataInfo: { fontSize: 12, color: "#aaa", marginTop: 24, lineHeight: 18 },
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
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
});
