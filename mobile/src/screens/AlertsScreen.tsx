import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { Alert } from "@finance-tracking/shared-types";
import { api } from "../api/client";

const SEVERITY_COLORS: Record<Alert["severity"], string> = {
  low: "#2e7d32",
  medium: "#f9a825",
  high: "#c62828",
  incomplete: "#757575",
};

export function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api
        .getAlerts()
        .then(setAlerts)
        .finally(() => setLoading(false));
    }, [])
  );

  const onPressAlert = async (alert: Alert) => {
    if (alert.isRead) return;
    await api.markAlertRead(alert.id);
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, isRead: true } : a)));
  };

  if (loading) return <ActivityIndicator style={styles.spinner} />;

  return (
    <FlatList
      style={styles.container}
      data={alerts}
      keyExtractor={(a) => a.id}
      ListEmptyComponent={<Text style={styles.empty}>No alerts yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, !item.isRead && styles.unread]}
          onPress={() => onPressAlert(item)}
        >
          <View style={[styles.dot, { backgroundColor: SEVERITY_COLORS[item.severity] }]} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  spinner: { marginTop: 32 },
  empty: { textAlign: "center", marginTop: 32, color: "#757575" },
  row: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  unread: { backgroundColor: "#f5f5f5" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  textContainer: { flex: 1 },
  title: { fontWeight: "700" },
  message: { fontSize: 13, color: "#555", marginTop: 2 },
  date: { fontSize: 11, color: "#999", marginTop: 4 },
});
