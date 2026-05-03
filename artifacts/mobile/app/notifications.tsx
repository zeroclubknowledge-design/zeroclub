import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

interface AppNotification {
  id: string;
  type: string;
  icon: string;
  iconColor: string;
  title: string;
  message: string;
  createdAt: string;
  xp?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

function groupByDay(items: AppNotification[]): { label: string; data: AppNotification[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const todayItems: AppNotification[] = [];
  const weekItems: AppNotification[] = [];
  const olderItems: AppNotification[] = [];

  for (const n of items) {
    const d = new Date(n.createdAt);
    if (d >= today) todayItems.push(n);
    else if (d >= weekAgo) weekItems.push(n);
    else olderItems.push(n);
  }

  const groups: { label: string; data: AppNotification[] }[] = [];
  if (todayItems.length) groups.push({ label: "Today", data: todayItems });
  if (weekItems.length) groups.push({ label: "This Week", data: weekItems });
  if (olderItems.length) groups.push({ label: "Earlier", data: olderItems });
  return groups;
}

function NotifCard({ item, colors }: { item: AppNotification; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.iconColor + "22" }]}>
        <Feather name={item.icon as keyof typeof Feather.glyphMap} size={18} color={item.iconColor} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
          {item.xp ? (
            <View style={[styles.xpBadge, { backgroundColor: "#f59e0b22" }]}>
              <Feather name="zap" size={10} color="#f59e0b" />
              <Text style={styles.xpBadgeText}>+{item.xp}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.cardMsg, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!token) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    try {
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { notifications: AppNotification[] };
        setNotifications(data.notifications);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchNotifs().finally(() => setLoading(false));
  }, [fetchNotifs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  }, [fetchNotifs]);

  const groups = groupByDay(notifications);

  type ListItem =
    | { _type: "header"; label: string; key: string }
    | { _type: "item"; item: AppNotification; key: string };

  const flat: ListItem[] = [];
  for (const g of groups) {
    flat.push({ _type: "header", label: g.label, key: `hdr-${g.label}` });
    for (const n of g.data) {
      flat.push({ _type: "item", item: n, key: n.id });
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="bell-off" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Your activity and XP updates will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(x) => x.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item: row }) => {
            if (row._type === "header") {
              return (
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  {row.label}
                </Text>
              );
            }
            return <NotifCard item={row.item} colors={colors} />;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 3 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  xpBadgeText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
  cardMsg: { fontSize: 13, lineHeight: 18 },
  cardTime: { fontSize: 11, marginTop: 2 },
});
