import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { WatchlistEntry } from "@finance-tracking/shared-types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { ScoreBadge } from "../components/ScoreBadge";

type Props = NativeStackScreenProps<RootStackParamList, "Watchlist">;

export function WatchlistScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getWatchlist();
      setEntries(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onAddTicker = async () => {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;
    setNewTicker("");
    try {
      await api.addToWatchlist(ticker);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add ticker (e.g. AAPL)"
          value={newTicker}
          onChangeText={setNewTicker}
          autoCapitalize="characters"
          onSubmitEditing={onAddTicker}
        />
        <Button title="Add" onPress={onAddTicker} />
      </View>

      <Button title="View alerts" onPress={() => navigation.navigate("Alerts")} />

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.company.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No companies tracked yet — add a ticker above.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate("CompanyDetail", {
                  companyId: item.company.id,
                  ticker: item.company.ticker,
                })
              }
            >
              <View style={styles.rowHeader}>
                <Text style={styles.ticker}>{item.company.ticker}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {item.company.name}
                </Text>
              </View>
              <View style={styles.badges}>
                {item.latestScores.map((score) => (
                  <ScoreBadge key={score.id} score={score} />
                ))}
              </View>
              {item.lastFilingDate && (
                <Text style={styles.meta}>
                  Last filing: {new Date(item.lastFilingDate).toLocaleDateString()}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8 },
  error: { color: "#c62828", marginVertical: 8 },
  spinner: { marginTop: 32 },
  empty: { textAlign: "center", marginTop: 32, color: "#757575" },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowHeader: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  ticker: { fontSize: 16, fontWeight: "700" },
  name: { fontSize: 13, color: "#555", flexShrink: 1 },
  badges: { flexDirection: "row", marginTop: 6 },
  meta: { fontSize: 11, color: "#999", marginTop: 4 },
});
