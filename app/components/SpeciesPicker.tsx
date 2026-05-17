import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import type { TaxonGroup, Species, TaxonRank } from "../services/db";
import { GROUP_ALL_ID, makeGroupAllSentinel } from "../services/db";

const RANK_LABEL: Record<TaxonRank, string> = {
  species: "art",
  subspecies: "underart",
  genus: "släkte",
  family: "familj",
};

interface Props {
  groups: TaxonGroup[];
  selectedGroup: TaxonGroup | null;
  onGroupSelect: (group: TaxonGroup) => void;
  allTaxa: Species[];
  selection: Species | null;
  onSelect: (taxon: Species) => void;
}

export function SpeciesPicker({
  groups,
  selectedGroup,
  onGroupSelect,
  allTaxa,
  selection,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  function handleGroupSelect(g: TaxonGroup) {
    onGroupSelect(g);
    setOpen(false);
    setQuery("");
  }

  function handleSelect(taxon: Species) {
    onSelect(taxon);
    setOpen(false);
    setQuery("");
  }

  const displayed = query.trim()
    ? allTaxa.filter(
        (t) =>
          t.swedish?.toLowerCase().includes(query.toLowerCase()) ||
          t.scientific.toLowerCase().includes(query.toLowerCase()),
      )
    : allTaxa;

  const selectionLabel = selection
    ? (selection.swedish ?? selection.scientific)
    : selectedGroup
      ? makeGroupAllSentinel(selectedGroup).swedish
      : null;

  return (
    <View>
      {/* Group chips */}
      {groups.length <= 5 ? (
        <View
          style={styles.chips}
          accessibilityRole="tablist"
          accessibilityLabel="Artgrupper"
        >
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.chip,
                selectedGroup?.id === g.id && styles.chipActive,
              ]}
              onPress={() => handleGroupSelect(g)}
              accessibilityRole="tab"
              accessibilityLabel={g.swedish ?? g.scientific}
              accessibilityState={{ selected: selectedGroup?.id === g.id }}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedGroup?.id === g.id && styles.chipTextActive,
                ]}
              >
                {g.swedish ?? g.scientific}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.groupDropdownWrap}>
          <TextInput
            style={styles.input}
            placeholder="Sök grupp..."
            value={query}
            onChangeText={(t) => setQuery(t)}
          />
        </View>
      )}

      {/* Taxon trigger + searchable dropdown */}
      {selectedGroup && (
        <>
          {!open && (
            <Pressable
              style={styles.trigger}
              onPress={() => setOpen(true)}
              accessibilityRole="combobox"
              accessibilityLabel="Välj art eller taxon"
              accessibilityState={{ expanded: false }}
              accessibilityHint="Tryck för att öppna listan"
            >
              <Text
                style={
                  selectionLabel
                    ? styles.triggerText
                    : styles.triggerPlaceholder
                }
                numberOfLines={1}
              >
                {selectionLabel ?? "Sök familj, släkte eller art..."}
              </Text>
              <Text style={styles.chevron} accessibilityElementsHidden>
                ▾
              </Text>
            </Pressable>
          )}

          {open && (
            <>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Sök familj, släkte eller art..."
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
                accessibilityLabel="Arter och taxon"
              >
                {/* Pinned "all" option */}
                {!query.trim() &&
                  (() => {
                    const sentinel = makeGroupAllSentinel(selectedGroup);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.row,
                          styles.rowAll,
                          selection?.id === GROUP_ALL_ID && styles.rowSelected,
                        ]}
                        onPress={() => handleSelect(sentinel)}
                        accessibilityRole="button"
                        accessibilityLabel={sentinel.swedish ?? "Alla"}
                        accessibilityState={{
                          selected: selection?.id === GROUP_ALL_ID,
                        }}
                      >
                        <Text
                          style={[
                            styles.rowText,
                            selection?.id === GROUP_ALL_ID &&
                              styles.rowTextSelected,
                          ]}
                        >
                          {sentinel.swedish}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                {displayed.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.row,
                      selection?.id === item.id && styles.rowSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.swedish ?? item.scientific}, ${RANK_LABEL[item.rank]}`}
                    accessibilityState={{ selected: selection?.id === item.id }}
                  >
                    <View style={styles.rowMain}>
                      <Text
                        style={[
                          styles.rowText,
                          selection?.id === item.id && styles.rowTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.swedish ?? item.scientific}
                      </Text>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>
                          {RANK_LABEL[item.rank]}
                        </Text>
                      </View>
                    </View>
                    {item.swedish && (
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {item.scientific}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}

                {displayed.length === 0 && (
                  <View style={styles.hint}>
                    <Text
                      style={styles.hintText}
                      accessibilityLiveRegion="polite"
                    >
                      Inga träffar
                    </Text>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center" as const,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },
  chipActive: { backgroundColor: "#023e8a", borderColor: "#023e8a" },
  chipText: { fontSize: 14, color: "#444" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  groupDropdownWrap: { marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111",
  },
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
  rowAll: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  rowSelected: { backgroundColor: "#eef4ff" },
  rowMain: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { fontSize: 15, color: "#111", flexShrink: 1 },
  rowTextSelected: { color: "#023e8a", fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#717171", fontStyle: "italic", marginTop: 1 },
  rankBadge: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: "#f5f5f5",
  },
  rankBadgeText: { fontSize: 10, color: "#777", fontStyle: "italic" },
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
