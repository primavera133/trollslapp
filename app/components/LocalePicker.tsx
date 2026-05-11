import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Locale } from "../services/db";
import { SWEDEN_LOCALE } from "../services/db";

type LocaleTab = "sweden" | "province" | "municipality";

interface Props {
  locales: Locale[];
  selected: Locale | null;
  onSelect: (locale: Locale) => void;
  localeType: LocaleTab;
  onLocaleTypeChange: (type: LocaleTab) => void;
}

export function LocalePicker({
  locales,
  selected,
  onSelect,
  localeType,
  onLocaleTypeChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  const displayed = query.trim()
    ? locales.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
    : locales;

  function handleSelect(locale: Locale) {
    onSelect(locale);
    setOpen(false);
    setQuery("");
  }

  function handleTypeChange(type: LocaleTab) {
    onLocaleTypeChange(type);
    setOpen(false);
    setQuery("");
  }

  return (
    <View>
      {/* Toggle */}
      <View style={styles.toggle} accessibilityRole="tablist">
        {(["sweden", "province", "municipality"] as const).map((type) => {
          const label = type === "sweden" ? "Sverige" : type === "province" ? "Landskap" : "Kommun"
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.toggleBtn,
                localeType === type && styles.toggleBtnActive,
              ]}
              onPress={() => handleTypeChange(type)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: localeType === type }}
            >
              <Text
                style={[
                  styles.toggleText,
                  localeType === type && styles.toggleTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Trigger — shows selected value; tap to open (hidden when Sverige is active) */}
      {localeType !== "sweden" && !open && (
        <Pressable
          style={styles.trigger}
          onPress={() => setOpen(true)}
          accessibilityRole="combobox"
          accessibilityLabel={localeType === "province" ? "Välj landskap" : "Välj kommun"}
          accessibilityState={{ expanded: false }}
          accessibilityHint="Tryck för att öppna listan"
        >
          <Text
            style={selected ? styles.triggerText : styles.triggerPlaceholder}
            numberOfLines={1}
          >
            {selected?.name ??
              (localeType === "province"
                ? "Välj landskap..."
                : "Välj kommun...")}
          </Text>
          <Text style={styles.chevron} accessibilityElementsHidden>▾</Text>
        </Pressable>
      )}

      {/* Search input — only mounted when open and a region type is active */}
      {localeType !== "sweden" && open && (
        <>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={
              localeType === "province" ? "Sök landskap..." : "Sök kommun..."
            }
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (displayed.length === 1) handleSelect(displayed[0]);
            }}
          />
          <ScrollView
            style={styles.dropdown}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            accessibilityRole="list"
            accessibilityLabel="Platser"
          >
            {displayed.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.row,
                  selected?.id === item.id && styles.rowSelected,
                ]}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                accessibilityState={{ selected: selected?.id === item.id }}
              >
                <Text
                  style={[
                    styles.rowText,
                    selected?.id === item.id && styles.rowTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
            {displayed.length === 0 && (
              <View style={styles.hint}>
                <Text style={styles.hintText} accessibilityLiveRegion="polite">Inga träffar</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.closeRow}
              onPress={() => {
                setOpen(false);
                setQuery("");
              }}
              accessibilityRole="button"
              accessibilityLabel="Stäng listan"
            >
              <Text style={styles.closeText}>Stäng</Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center" as const,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  toggleBtnActive: { backgroundColor: "#023e8a" },
  toggleText: { fontSize: 14, color: "#444" },
  toggleTextActive: { color: "#fff", fontWeight: "600" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  triggerText: { flex: 1, fontSize: 15, color: "#111" },
  triggerPlaceholder: { flex: 1, fontSize: 15, color: "#767676" },
  chevron: { fontSize: 12, color: "#767676", marginLeft: 4 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#023e8a",
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#023e8a",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#fff",
    maxHeight: 320,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center" as const,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  rowSelected: { backgroundColor: "#eef4ff" },
  rowText: { fontSize: 15, color: "#111" },
  rowTextSelected: { color: "#023e8a", fontWeight: "600" },
  hint: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  hintText: { fontSize: 13, color: "#767676", fontStyle: "italic" },
  closeRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center" as const,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    alignItems: "flex-end",
  },
  closeText: { fontSize: 13, color: "#023e8a" },
});
