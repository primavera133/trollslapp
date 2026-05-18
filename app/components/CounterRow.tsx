import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Species } from "../services/db";

type Gender = "male" | "female" | "unknown";

interface Props {
  species: Species;
  male: number;
  female: number;
  unknown: number;
  expanded?: boolean;
  onPress?: () => void;
  onIncrement: (gender: Gender) => void;
  onDecrement: (gender: Gender) => void;
}

function GenderCounter({
  label,
  symbol,
  count,
  onIncrement,
  onDecrement,
}: {
  label: string;
  symbol: string;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={styles.genderRow}>
      <View style={styles.genderLabelContainer}>
        <Text style={styles.genderSymbol}>{symbol}</Text>
        <Text style={styles.genderLabelText}>{label}</Text>
      </View>
      <View style={styles.genderControls}>
        <TouchableOpacity
          style={[
            styles.smallButton,
            count === 0 && styles.smallButtonDisabled,
          ]}
          onPress={onDecrement}
          disabled={count === 0}
          accessibilityLabel={`Minska ${label}`}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.smallButtonText,
              count === 0 && styles.smallButtonTextDisabled,
            ]}
          >
            −
          </Text>
        </TouchableOpacity>
        <Text style={styles.genderCount}>{count}</Text>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={onIncrement}
          accessibilityLabel={`Öka ${label}`}
          accessibilityRole="button"
        >
          <Text style={styles.smallButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function CounterRow({
  species,
  male,
  female,
  unknown: unknownCount,
  expanded = false,
  onPress,
  onIncrement,
  onDecrement,
}: Props) {
  const total = male + female + unknownCount;
  const isOpen = expanded || total > 0;

  const rawName = species.swedish ?? species.scientific;
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <View style={[styles.row, total > 0 && styles.rowHighlighted]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => onPress?.()}
        activeOpacity={total > 0 ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={styles.nameContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {species.swedish && (
            <Text style={styles.scientific} numberOfLines={1}>
              {species.scientific}
            </Text>
          )}
        </View>
        <Text
          style={styles.total}
          accessibilityLabel={`${total} observationer`}
        >
          {total}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.genderSection}>
          <GenderCounter
            label="Hanar"
            symbol="♂"
            count={male}
            onIncrement={() => onIncrement("male")}
            onDecrement={() => onDecrement("male")}
          />
          <GenderCounter
            label="Honor"
            symbol="♀"
            count={female}
            onIncrement={() => onIncrement("female")}
            onDecrement={() => onDecrement("female")}
          />
          <GenderCounter
            label="Okänt kön"
            symbol="?"
            count={unknownCount}
            onIncrement={() => onIncrement("unknown")}
            onDecrement={() => onDecrement("unknown")}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  rowHighlighted: {
    backgroundColor: "#e8f4f8",
    borderColor: "#b3d9e8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    color: "#111",
  },
  scientific: {
    fontSize: 12,
    color: "#717171",
    fontStyle: "italic",
    marginTop: 2,
  },
  total: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    minWidth: 32,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  genderSection: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  genderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  genderLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 100,
  },
  genderSymbol: {
    fontSize: 18,
    width: 20,
    textAlign: "center",
    color: "#444",
  },
  genderLabelText: {
    fontSize: 13,
    color: "#717171",
  },
  genderControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#023e8a",
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonDisabled: {
    backgroundColor: "#ddd",
  },
  smallButtonText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 24,
  },
  smallButtonTextDisabled: {
    color: "#999",
  },
  genderCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    minWidth: 28,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
