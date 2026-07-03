import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Company, Filing, RedFlagScore } from "@finance-tracking/shared-types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { ScoreBadge } from "../components/ScoreBadge";

type Props = NativeStackScreenProps<RootStackParamList, "CompanyDetail">;

type CompanyDetail = Company & { filings: Filing[]; scores: RedFlagScore[] };

export function CompanyDetailScreen({ route, navigation }: Props) {
  const { companyId } = route.params;
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api
        .getCompany(companyId)
        .then(setData)
        .finally(() => setLoading(false));
    }, [companyId])
  );

  if (loading) return <ActivityIndicator style={styles.spinner} />;
  if (!data) return <Text style={styles.empty}>Company not found.</Text>;

  const scoresByType = data.scores.reduce<Record<string, RedFlagScore[]>>((acc, s) => {
    (acc[s.scoreType] ??= []).push(s);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Latest scores</Text>
      <View style={styles.badges}>
        {Object.values(scoresByType).map((scores) => (
          <ScoreBadge key={scores[0].id} score={scores[0]} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent filings</Text>
      <FlatList
        data={data.filings}
        keyExtractor={(f) => f.id}
        ListEmptyComponent={<Text style={styles.empty}>No filings ingested yet.</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            disabled={index === data.filings.length - 1}
            onPress={() => navigation.navigate("FilingDiff", { companyId, filingId: item.id })}
          >
            <Text style={styles.filingType}>{item.formType}</Text>
            <Text style={styles.filingDate}>
              Period ending {new Date(item.periodOfReport).toLocaleDateString()} — filed{" "}
              {new Date(item.filingDate).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  spinner: { marginTop: 32 },
  empty: { color: "#757575", marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 16, marginBottom: 8, color: "#333" },
  badges: { flexDirection: "row", flexWrap: "wrap" },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  filingType: { fontWeight: "700" },
  filingDate: { fontSize: 12, color: "#666", marginTop: 2 },
});
