import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Filing, FilingDiffLine } from "@finance-tracking/shared-types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "FilingDiff">;

function formatValue(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function FilingDiffScreen({ route }: Props) {
  const { companyId, filingId } = route.params;
  const [newFiling, setNewFiling] = useState<Filing | null>(null);
  const [priorFiling, setPriorFiling] = useState<Filing | null>(null);
  const [lines, setLines] = useState<FilingDiffLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFilingDiff(companyId, filingId)
      .then((res) => {
        setNewFiling(res.newFiling);
        setPriorFiling(res.priorFiling);
        setLines(res.diffLines);
      })
      .finally(() => setLoading(false));
  }, [companyId, filingId]);

  if (loading) return <ActivityIndicator style={styles.spinner} />;

  if (!priorFiling) {
    return (
      <Text style={styles.empty}>
        No prior {newFiling?.formType} filing to compare against yet.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Comparing {new Date(priorFiling.periodOfReport).getUTCFullYear()} →{" "}
        {newFiling && new Date(newFiling.periodOfReport).getUTCFullYear()}
      </Text>
      <FlatList
        data={lines}
        keyExtractor={(l) => l.concept}
        renderItem={({ item }) => (
          <View style={[styles.row, item.materialityFlag && styles.materialRow]}>
            <Text style={styles.concept}>{item.concept.replace(/^us-gaap:/, "")}</Text>
            <View style={styles.values}>
              <Text style={styles.value}>{formatValue(item.priorValue)}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.value}>{formatValue(item.newValue)}</Text>
              {item.deltaPct !== null && (
                <Text style={[styles.delta, item.materialityFlag && styles.materialText]}>
                  {item.deltaPct >= 0 ? "+" : ""}
                  {(item.deltaPct * 100).toFixed(1)}%
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  spinner: { marginTop: 32 },
  empty: { color: "#757575", margin: 16 },
  header: { fontSize: 13, color: "#666", marginBottom: 12 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  materialRow: { backgroundColor: "#fff8e1" },
  concept: { fontSize: 13, fontWeight: "600" },
  values: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  value: { fontSize: 13, color: "#333" },
  arrow: { color: "#999" },
  delta: { fontSize: 12, fontWeight: "700", marginLeft: "auto", color: "#555" },
  materialText: { color: "#e65100" },
});
