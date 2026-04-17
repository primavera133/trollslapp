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

interface Props {
  locales: Locale[];
  selected: Locale | null;
  onSelect: (locale: Locale) => void;
  localeType: "province" | "municipality";
  onLocaleTypeChange: (type: "province" | "municipality") => void;
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

  function handleTypeChange(type: "province" | "municipality") {
    onLocaleTypeChange(type);
    setOpen(false);
    setQuery("");
  }

  return (
    <View>
      {/* Toggle */}
      <View style={styles.toggle}>
        {(["province", "municipality"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.toggleBtn,
              localeType === type && styles.toggleBtnActive,
            ]}
            onPress={() => handleTypeChange(type)}
          >
            <Text
              style={[
                styles.toggleText,
                localeType === type && styles.toggleTextActive,
              ]}
            >
              {type === "province" ? "Landskap" : "Kommun"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trigger — shows selected value; tap to open */}
      {!open && (
        <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
          <Text
            style={selected ? styles.triggerText : styles.triggerPlaceholder}
            numberOfLines={1}
          >
            {selected?.name ??
              (localeType === "province"
                ? "Välj landskap..."
                : "Välj kommun...")}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
      )}

      {/* Search input — only mounted when open */}
      {open && (
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
          <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled">
            {displayed.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.row,
                  selected?.id === item.id && styles.rowSelected,
                ]}
                onPress={() => handleSelect(item)}
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
                <Text style={styles.hintText}>Inga träffar</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.closeRow}
              onPress={() => {
                setOpen(false);
                setQuery("");
              }}
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
    paddingVertical: 8,
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
  triggerPlaceholder: { flex: 1, fontSize: 15, color: "#aaa" },
  chevron: { fontSize: 12, color: "#aaa", marginLeft: 4 },
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
  hintText: { fontSize: 13, color: "#aaa", fontStyle: "italic" },
  closeRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    alignItems: "flex-end",
  },
  closeText: { fontSize: 13, color: "#023e8a" },
});
