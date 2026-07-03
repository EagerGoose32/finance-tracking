import { StyleSheet, Text, View } from "react-native";
import type { RedFlagScore } from "@finance-tracking/shared-types";

const RISK_COLORS: Record<RedFlagScore["riskLevel"], string> = {
  low: "#2e7d32",
  medium: "#f9a825",
  high: "#c62828",
  incomplete: "#757575",
};

const SCORE_LABELS: Record<RedFlagScore["scoreType"], string> = {
  piotroski_f: "Piotroski F",
  altman_z: "Altman Z",
  beneish_m: "Beneish M",
};

export function ScoreBadge({ score }: { score: RedFlagScore }) {
  const color = RISK_COLORS[score.riskLevel];

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{SCORE_LABELS[score.scoreType]}</Text>
      <Text style={[styles.value, { color }]}>
        {score.riskLevel === "incomplete" ? "N/A" : score.scoreValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    alignItems: "center",
  },
  label: { fontSize: 11, fontWeight: "600" },
  value: { fontSize: 14, fontWeight: "700" },
});
