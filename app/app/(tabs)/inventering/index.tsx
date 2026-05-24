import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CountdownTimer } from "../../../components/CountdownTimer";
import { CounterRow } from "../../../components/CounterRow";
import { LocationMap } from "../../../components/LocationMap";
import {
  isDbPopulated,
  queryAllTaxa,
  queryTaxonGroups,
  type Species,
} from "../../../services/db";
import { querySpeciesNearLocation } from "../../../services/inventory";
import {
  formatReportText,
  saveReport,
  type SavedReport,
} from "../../../services/inventoryStorage";
import {
  fetchWeather,
  formatWeather,
  type WeatherData,
} from "../../../services/weather";

interface ChecklistEntry {
  species: Species;
  male: number;
  female: number;
  unknown: number;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DURATION_MINUTES = 15;
const DURATION_MS = DURATION_MINUTES * 60 * 1000;

export default function InventeringScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const mapWidth = Math.min(screenWidth - 32, 700 - 32);

  const [step, setStepRaw] = useState<Step>(1);
  const stepRef = useRef<Step>(1);

  const goForward = useCallback((newStep: Step) => {
    stepRef.current = newStep;
    setStepRaw(newStep);
    if (Platform.OS === "web") {
      window.history.pushState({ step: newStep }, "");
    }
  }, []);

  const goBack = useCallback(() => {
    if (Platform.OS === "web") {
      window.history.back();
    } else {
      const prev = (stepRef.current - 1) as Step;
      if (prev >= 1) {
        stepRef.current = prev;
        setStepRaw(prev);
      }
    }
  }, []);

  const resetToStart = useCallback(() => {
    if (Platform.OS === "web") {
      const stepsBack = stepRef.current - 1;
      if (stepsBack > 0) window.history.go(-stepsBack);
    }
    stepRef.current = 1;
    setStepRaw(1);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handlePopState = (e: PopStateEvent) => {
        if (stepRef.current === 4) {
          window.history.pushState({ step: 4 }, "");
          window.history.pushState({ step: 4, guard: true }, "");
          setShowCancelConfirm(true);
          return;
        }
        if (stepRef.current === 5) {
          window.history.pushState({ step: 5 }, "");
          return;
        }
        const prevStep = e.state?.step ?? 1;
        stepRef.current = prevStep;
        setStepRaw(prevStep);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }

    const handleBack = () => {
      const current = stepRef.current;
      if (current === 4) {
        handleBackFromTimer();
        return true;
      }
      if (current === 5) {
        return true;
      }
      if (current > 1) {
        const prev = (current - 1) as Step;
        stepRef.current = prev;
        setStepRaw(prev);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => sub.remove();
  }, []);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistEntry[]>([]);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
  const [addSpeciesOpen, setAddSpeciesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [expandedSpeciesId, setExpandedSpeciesId] = useState<number | null>(
    null,
  );

  const allSpeciesRef = useRef<Species[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const handleStart = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg(
          "Platsåtkomst nekades. Du kan starta en inventering utan förifylld artlista.",
        );
        setLatitude(59.3293);
        setLongitude(18.0686);
        setChecklist([]);
        goForward(2);
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);
      goForward(2);
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=sv`,
      )
        .then((r) => r.json())
        .then((data) => {
          const a = data?.address;
          if (a) {
            const name =
              a.municipality || a.city || a.town || a.village || a.county || "";
            setTitle(name.replace(/ kommun$/i, ""));
          }
        })
        .catch(() => {});
    } catch {
      setErrorMsg("Kunde inte hämta position. Försök igen.");
    }

    setLoading(false);
  }, []);

  const handleLocationNext = useCallback(() => {
    const species = querySpeciesNearLocation(latitude, longitude);
    setChecklist(
      species.map((s) => ({ species: s, male: 0, female: 0, unknown: 0 })),
    );

    const grps = queryTaxonGroups();
    if (grps.length > 0) {
      allSpeciesRef.current = queryAllTaxa(grps[0].id);
    }

    goForward(3);
  }, [latitude, longitude]);

  const handleRemoveSpecies = useCallback((id: number) => {
    setChecklist((prev) => prev.filter((e) => e.species.id !== id));
  }, []);

  const handleAddSpecies = useCallback((species: Species) => {
    setChecklist((prev) => {
      if (prev.some((e) => e.species.id === species.id)) return prev;
      return [...prev, { species, male: 0, female: 0, unknown: 0 }];
    });
    setAddSpeciesOpen(false);
    setSearchQuery("");
  }, []);

  const handleStartTimer = useCallback(() => {
    const now = new Date();
    setStartTimeStr(
      now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }),
    );
    setEndTime(new Date(now.getTime() + DURATION_MS));
    goForward(4);
    if (Platform.OS === "web") {
      window.history.pushState({ step: 4, guard: true }, "");
    }
    fetchWeather(latitude, longitude).then(setWeather);
  }, [latitude, longitude]);

  type Gender = "male" | "female" | "unknown";

  const handleIncrement = useCallback((id: number, gender: Gender) => {
    setChecklist((prev) =>
      prev.map((e) =>
        e.species.id === id ? { ...e, [gender]: e[gender] + 1 } : e,
      ),
    );
  }, []);

  const handleDecrement = useCallback((id: number, gender: Gender) => {
    setChecklist((prev) =>
      prev.map((e) =>
        e.species.id === id && e[gender] > 0
          ? { ...e, [gender]: e[gender] - 1 }
          : e,
      ),
    );
  }, []);

  const handleTimerComplete = useCallback(() => {
    const now = new Date();
    setEndTimeStr(
      now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }),
    );
    goForward(5);
  }, []);

  const handleFinalizeReport = useCallback(async () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("sv-SE");

    const report: SavedReport = {
      id: now.toISOString(),
      title: title.trim() || undefined,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      latitude,
      longitude,
      weather,
      comment: comment.trim() || undefined,
      entries: checklist.map((e) => ({
        speciesId: e.species.id,
        swedish: e.species.swedish,
        scientific: e.species.scientific,
        count: e.male + e.female + e.unknown,
        male: e.male,
        female: e.female,
        unknown: e.unknown,
      })),
    };

    await saveReport(report);
    setSavedReport(report);
    goForward(6);
  }, [
    checklist,
    latitude,
    longitude,
    startTimeStr,
    endTimeStr,
    weather,
    comment,
    title,
  ]);

  const handleBackFromTimer = useCallback(() => {
    if (Platform.OS === "web") {
      setShowCancelConfirm(true);
    } else {
      Alert.alert(
        "Avbryt inventering?",
        "All data från denna inventering kommer att förloras.",
        [
          { text: "Fortsätt", style: "cancel" },
          { text: "Avbryt", style: "destructive", onPress: resetToStart },
        ],
      );
    }
  }, []);

  const handleNewInventory = useCallback(() => {
    resetToStart();
    setLatitude(0);
    setLongitude(0);
    setChecklist([]);
    setEndTime(null);
    setStartTimeStr("");
    setEndTimeStr("");
    setSavedReport(null);
    setErrorMsg(null);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!savedReport) return;
    const text = formatReportText(savedReport);
    if (Platform.OS === "web") {
      await navigator.clipboard.writeText(text);
    } else {
      await Clipboard.setStringAsync(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [savedReport]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const checklistIds = new Set(checklist.map((e) => e.species.id));
    return allSpeciesRef.current.filter(
      (s) =>
        (s.rank === "species" || s.rank === "subspecies") &&
        !checklistIds.has(s.id) &&
        (s.swedish?.toLowerCase().includes(q) ||
          s.scientific.toLowerCase().includes(q)),
    );
  }, [searchQuery, checklist]);

  const sortedChecklist = checklist;

  if (!isDbPopulated()) {
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

  // Step 1: Start
  if (step === 1) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading} accessibilityRole="header">
            Inventering
          </Text>
          <Text style={styles.subheading}>
            Registrera vad du ser på {DURATION_MINUTES} minuter.
          </Text>

          <Image
            source={require("../../../assets/ravlunda.jpeg")}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityLabel="Trollslända i naturen"
          />

          <View style={styles.banner}>
            <Ionicons name="information-circle" size={22} color="#856404" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerText}>
                OBS! Automatisk rapportering till Artportalen är inte ännu på
                plats. Rapporterna sparas enbart lokalt på din enhet.
              </Text>
              <Text style={styles.bannerText}>
                Du kan kopiera rapporten och registrera manuellt.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Standardiserad inventering</Text>
            <Text style={styles.cardBody}>
              Genomför en {DURATION_MINUTES}-minuters inventering av
              trollsländor. Det är en enkel metod att få jämförbara resultat.
            </Text>
            <Text style={styles.cardBody}>{"\n"}1. Ställ dig på en lämplig plats.</Text>
            <Text style={styles.cardBody}>
              2. Din GPS-position ger en lokal lista på tidigare sedda arter att
              utgå ifrån. Du kan lägga till arter om du ser något nytt.
            </Text>
            <Text style={styles.cardBody}>
              3. Starta klockan och registrera vad du ser inom tidsintervallet.
            </Text>
            <Text style={styles.cardBody}>
              4. Efteråt får du en rapport som du kan rapportera in på
              Artportalen.se (automatisk registrering kommer)
            </Text>
            <Text style={styles.cardBody}>
              5. Dina rapporter sparas här i appen och du kan återkomma till dem
              senare.
            </Text>
          </View>

          {errorMsg && (
            <View style={styles.errorCard}>
              <Ionicons name="warning-outline" size={20} color="#c1121f" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Starta ny inventering
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/(tabs)/mer/rapporter")}
            accessibilityRole="link"
          >
            <Ionicons name="document-text-outline" size={18} color="#023e8a" />
            <Text style={styles.linkText}>Visa sparade rapporter</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 2: Location
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
          >
            <Ionicons name="chevron-back" size={20} color="#023e8a" />
            <Text style={styles.backText}>Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>Steg 2 av 6</Text>
          <Text style={styles.heading} accessibilityRole="header">
            Välj plats
          </Text>
          <Text style={styles.cardBody}>
            Dra markören för att justera positionen.
          </Text>

          <View style={{ marginVertical: 16 }}>
            <LocationMap
              latitude={latitude}
              longitude={longitude}
              onLocationChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              width={mapWidth}
            />
          </View>

          <View style={styles.coordsRow}>
            <Text style={styles.coordsLabel}>Position:</Text>
            <Text style={styles.coordsValue}>
              {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLocationNext}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Nästa</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 3: Species list
  if (step === 3) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backRow}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Tillbaka"
          >
            <Ionicons name="chevron-back" size={20} color="#023e8a" />
            <Text style={styles.backText}>Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>Steg 3 av 6</Text>
          <Text style={styles.heading} accessibilityRole="header">
            Artlista
          </Text>
          <Text style={styles.cardBody}>
            Dessa {checklist.length} arter har hittats tidigare i ditt område,
            så här års. Redigera listan innan du startar inventeringen.
          </Text>

          {checklist.length === 0 && (
            <View style={styles.emptyListCard}>
              <Text style={styles.emptyListText}>
                Inga arter hittades i ditt område. Lägg till arter manuellt.
              </Text>
            </View>
          )}

          {checklist.map((entry) => (
            <View key={entry.species.id} style={styles.speciesListRow}>
              <View style={styles.speciesListName}>
                <Text style={styles.speciesName} numberOfLines={1}>
                  {capitalize(
                    entry.species.swedish ?? entry.species.scientific,
                  )}
                </Text>
                {entry.species.swedish && (
                  <Text style={styles.speciesSci} numberOfLines={1}>
                    {entry.species.scientific}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveSpecies(entry.species.id)}
                accessibilityLabel={`Ta bort ${capitalize(entry.species.swedish ?? entry.species.scientific)}`}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color="#c1121f" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setAddSpeciesOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={20} color="#023e8a" />
            <Text style={styles.secondaryButtonText}>Lägg till art</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartTimer}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Starta inventering</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={addSpeciesOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setAddSpeciesOpen(false);
            setSearchQuery("");
          }}
        >
          <SafeAreaView style={styles.addSpeciesModal}>
            <View style={styles.addSpeciesModalHeader}>
              <Text style={styles.addSpeciesModalTitle}>Lägg till art</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddSpeciesOpen(false);
                  setSearchQuery("");
                }}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Sök art..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              clearButtonMode="while-editing"
              returnKeyType="done"
            />
            <FlatList
              data={searchQuery.trim().length > 0 ? searchResults : []}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: s }) => (
                <TouchableOpacity
                  style={styles.searchResultRow}
                  onPress={() => handleAddSpecies(s)}
                  accessibilityRole="button"
                >
                  <Text style={styles.speciesName}>
                    {capitalize(s.swedish ?? s.scientific)}
                  </Text>
                  {s.swedish && (
                    <Text style={styles.speciesSci}>{s.scientific}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.trim().length > 0 ? (
                  <Text style={styles.noResults}>Inga träffar</Text>
                ) : null
              }
              style={{ flex: 1 }}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // Step 4: Timer + counts
  if (step === 4 && endTime) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.timerScreen}>
          <Text
            style={[styles.stepLabel, { paddingHorizontal: 16, paddingTop: 8 }]}
          >
            Steg 4 av 6
          </Text>

          <View style={{ paddingHorizontal: 16 }}>
            <CountdownTimer
              endTime={endTime}
              onComplete={handleTimerComplete}
            />
          </View>

          <FlatList
            ref={flatListRef}
            data={sortedChecklist}
            keyExtractor={(item) => String(item.species.id)}
            renderItem={({ item }) => (
              <CounterRow
                species={item.species}
                male={item.male}
                female={item.female}
                unknown={item.unknown}
                expanded={expandedSpeciesId === item.species.id}
                onPress={() =>
                  setExpandedSpeciesId((prev) =>
                    prev === item.species.id ? null : item.species.id,
                  )
                }
                onIncrement={(g) => handleIncrement(item.species.id, g)}
                onDecrement={(g) => handleDecrement(item.species.id, g)}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              <TouchableOpacity
                style={[styles.secondaryButton, { marginHorizontal: 0 }]}
                onPress={() => setAddSpeciesOpen(true)}
                accessibilityRole="button"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color="#023e8a"
                />
                <Text style={styles.secondaryButtonText}>Lägg till art</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <Modal
          visible={addSpeciesOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setAddSpeciesOpen(false);
            setSearchQuery("");
          }}
        >
          <SafeAreaView style={styles.addSpeciesModal}>
            <View style={styles.addSpeciesModalHeader}>
              <Text style={styles.addSpeciesModalTitle}>Lägg till art</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddSpeciesOpen(false);
                  setSearchQuery("");
                }}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Sök art..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              clearButtonMode="while-editing"
              returnKeyType="done"
            />
            <FlatList
              data={searchQuery.trim().length > 0 ? searchResults : []}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: s }) => (
                <TouchableOpacity
                  style={styles.searchResultRow}
                  onPress={() => handleAddSpecies(s)}
                  accessibilityRole="button"
                >
                  <Text style={styles.speciesName}>
                    {capitalize(s.swedish ?? s.scientific)}
                  </Text>
                  {s.swedish && (
                    <Text style={styles.speciesSci}>{s.scientific}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery.trim().length > 0 ? (
                  <Text style={styles.noResults}>Inga träffar</Text>
                ) : null
              }
              style={{ flex: 1 }}
            />
          </SafeAreaView>
        </Modal>

        <Modal
          visible={showCancelConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCancelConfirm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Avbryt inventering?</Text>
              <Text style={styles.modalBody}>
                All data från denna inventering kommer att förloras.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setShowCancelConfirm(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Fortsätt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonDestructive}
                  onPress={() => {
                    setShowCancelConfirm(false);
                    resetToStart();
                  }}
                >
                  <Text style={styles.modalButtonDestructiveText}>Avbryt</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Step 5: Review & adjust counts
  if (step === 5) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepLabel}>Steg 5 av 6</Text>
          <Text style={styles.heading} accessibilityRole="header">
            Granska inventering
          </Text>
          <Text style={styles.cardBody}>
            Tiden är slut! Justera antal om det behövs innan du sparar
            rapporten.
          </Text>

          {checklist.map((entry) => (
            <CounterRow
              key={entry.species.id}
              species={entry.species}
              male={entry.male}
              female={entry.female}
              unknown={entry.unknown}
              expanded={expandedSpeciesId === entry.species.id}
              onPress={() =>
                setExpandedSpeciesId((prev) =>
                  prev === entry.species.id ? null : entry.species.id,
                )
              }
              onIncrement={(g) => handleIncrement(entry.species.id, g)}
              onDecrement={(g) => handleDecrement(entry.species.id, g)}
            />
          ))}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setAddSpeciesOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={20} color="#023e8a" />
            <Text style={styles.secondaryButtonText}>Lägg till art</Text>
          </TouchableOpacity>

          <Modal
            visible={addSpeciesOpen}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => {
              setAddSpeciesOpen(false);
              setSearchQuery("");
            }}
          >
            <SafeAreaView style={styles.addSpeciesModal}>
              <View style={styles.addSpeciesModalHeader}>
                <Text style={styles.addSpeciesModalTitle}>Lägg till art</Text>
                <TouchableOpacity
                  onPress={() => {
                    setAddSpeciesOpen(false);
                    setSearchQuery("");
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={24} color="#111" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Sök art..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                clearButtonMode="while-editing"
                returnKeyType="done"
              />
              <FlatList
                data={searchQuery.trim().length > 0 ? searchResults : []}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: s }) => (
                  <TouchableOpacity
                    style={styles.searchResultRow}
                    onPress={() => handleAddSpecies(s)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.speciesName}>
                      {capitalize(s.swedish ?? s.scientific)}
                    </Text>
                    {s.swedish && (
                      <Text style={styles.speciesSci}>{s.scientific}</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.trim().length > 0 ? (
                    <Text style={styles.noResults}>Inga träffar</Text>
                  ) : null
                }
                style={{ flex: 1 }}
              />
            </SafeAreaView>
          </Modal>

          <Text style={styles.commentLabel}>Titel</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Namn på inventeringen..."
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.commentLabel}>Kommentar</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Valfri kommentar om inventeringen..."
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleFinalizeReport}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Spara rapport</Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Step 6: Report
  if (step === 6 && savedReport) {
    const observed = savedReport.entries.filter((e) => e.count > 0);
    const totalSpecies = observed.length;
    const totalIndividuals = observed.reduce((sum, e) => sum + e.count, 0);

    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.stepLabel}>Steg 6 av 6</Text>
          <Text style={styles.heading} accessibilityRole="header">
            {savedReport.title || "Rapport"}
          </Text>

          <LocationMap
            latitude={savedReport.latitude}
            longitude={savedReport.longitude}
            width={Math.min(screenWidth - 32, 700 - 32)}
            interactive={false}
          />

          <View style={[styles.reportCard, { marginTop: 12 }]}>
            <Text style={styles.reportMeta}>
              {savedReport.date} {savedReport.startTime}–{savedReport.endTime}
            </Text>
            <Text style={styles.reportMeta}>
              {savedReport.latitude.toFixed(4)}°N,{" "}
              {savedReport.longitude.toFixed(4)}°E
            </Text>
            {savedReport.weather && (
              <Text style={styles.reportMeta}>
                {formatWeather(savedReport.weather)}
              </Text>
            )}

            <View style={styles.reportDivider} />

            {observed.length > 0 ? (
              observed.map((entry) => (
                <View key={entry.speciesId} style={styles.reportEntry}>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportSpecies} numberOfLines={1}>
                      {capitalize(entry.swedish ?? entry.scientific)}
                    </Text>
                    <Text style={styles.reportCount}>{entry.count}</Text>
                  </View>
                  {(entry.male > 0 ||
                    entry.female > 0 ||
                    entry.unknown > 0) && (
                    <Text style={styles.reportGender}>
                      {[
                        entry.male > 0 ? `♂ ${entry.male}` : null,
                        entry.female > 0 ? `♀ ${entry.female}` : null,
                        entry.unknown > 0 ? `? ${entry.unknown}` : null,
                      ]
                        .filter(Boolean)
                        .join("  ")}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyListText}>Inga arter observerade.</Text>
            )}

            <View style={styles.reportDivider} />
            <Text style={styles.reportTotal}>
              Totalt: {totalSpecies} arter, {totalIndividuals} individer
            </Text>
            {savedReport.comment && (
              <Text style={styles.reportComment}>{savedReport.comment}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCopy}
            accessibilityRole="button"
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={20}
              color="#023e8a"
            />
            <Text style={styles.secondaryButtonText}>
              {copied ? "Kopierad!" : "Kopiera rapport"}
            </Text>
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#717171"
            />
            <Text style={styles.noteText}>
              Rapportering till Artportalen kommer snart.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNewInventory}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Ny inventering</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: { padding: 16, paddingBottom: 40, maxWidth: 700, width: "100%" },
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff3cd",
    borderWidth: 1,
    borderColor: "#ffc107",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerTextContainer: {
    flex: 1,
    gap: 6,
  },
  bannerText: {
    fontSize: 13,
    color: "#856404",
    lineHeight: 18,
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
  heading: { fontSize: 22, fontWeight: "700", color: "#111", marginBottom: 4 },
  subheading: { fontSize: 15, color: "#666", marginBottom: 16 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    minHeight: 44,
  },
  backText: { fontSize: 15, color: "#023e8a", fontWeight: "500" },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#023e8a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  cardBody: { fontSize: 14, color: "#444", lineHeight: 22, marginBottom: 12 },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { flex: 1, fontSize: 13, color: "#c1121f", lineHeight: 18 },
  primaryButton: {
    backgroundColor: "#023e8a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    padding: 8,
  },
  linkText: { fontSize: 15, color: "#023e8a", fontWeight: "500" },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#023e8a",
    borderRadius: 12,
    paddingVertical: 12,
    marginVertical: 8,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "600", color: "#023e8a" },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  coordsLabel: { fontSize: 13, color: "#717171" },
  coordsValue: { fontSize: 14, fontWeight: "600", color: "#111" },
  speciesListRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  speciesListName: { flex: 1, marginRight: 8 },
  speciesName: { fontSize: 15, color: "#111" },
  speciesSci: {
    fontSize: 12,
    color: "#717171",
    fontStyle: "italic",
    marginTop: 2,
  },
  removeButton: { padding: 4 },
  addSpeciesContainer: { marginVertical: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#023e8a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111",
  },
  searchResults: {
    maxHeight: 200,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#ddd",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#fff",
  },
  searchResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  noResults: {
    padding: 12,
    color: "#767676",
    fontStyle: "italic",
    fontSize: 13,
  },
  emptyListCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  emptyListText: { fontSize: 14, color: "#717171", fontStyle: "italic" },
  timerScreen: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  reportMeta: { fontSize: 14, color: "#444", lineHeight: 22 },
  reportDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  reportEntry: {
    paddingVertical: 4,
  },
  reportSpecies: { flex: 1, fontSize: 15, color: "#111", marginRight: 12 },
  reportGender: {
    fontSize: 13,
    color: "#717171",
    marginTop: 2,
    paddingLeft: 2,
  },
  reportCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#023e8a",
    minWidth: 32,
    textAlign: "right",
  },
  reportTotal: { fontSize: 15, fontWeight: "700", color: "#111" },
  reportComment: {
    fontSize: 14,
    color: "#444",
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 20,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginTop: 16,
    marginBottom: 6,
  },
  titleInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    fontSize: 15,
    color: "#111",
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    fontSize: 14,
    color: "#111",
    minHeight: 80,
    marginBottom: 8,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  noteText: { flex: 1, fontSize: 13, color: "#717171", lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    width: 300,
    maxWidth: "90%",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  modalBody: { fontSize: 14, color: "#444", lineHeight: 20, marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalButtonCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancelText: { fontSize: 15, fontWeight: "600", color: "#023e8a" },
  modalButtonDestructive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#d32f2f",
  },
  modalButtonDestructiveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  addSpeciesModal: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  addSpeciesModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 12,
  },
  addSpeciesModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
});
