import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getGetWalletQueryOptions,
  getListXpEventsQueryOptions,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { XpEvent } from "@workspace/api-client-react";

const SOURCE_LABELS: Record<string, string> = {
  build_posted: "Build Posted",
  proof_project: "Proof Project",
  bootcamp_module: "Module Complete",
  bootcamp_completed: "Bootcamp Done",
};

const SOURCE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  build_posted: "edit-3",
  proof_project: "zap",
  bootcamp_module: "book",
  bootcamp_completed: "award",
};

function timeAgo(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: wallet, isLoading: walletLoading } = useQuery(getGetWalletQueryOptions());
  const { data: events, isLoading: eventsLoading } = useQuery(getListXpEventsQueryOptions());

  const xpProgress =
    wallet && wallet.totalXpForNextLevel !== wallet.xpForCurrentLevel
      ? Math.max(
          0,
          Math.min(
            100,
            ((wallet.xpBalance - wallet.xpForCurrentLevel) /
              (wallet.totalXpForNextLevel - wallet.xpForCurrentLevel)) *
              100,
          ),
        )
      : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 10,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>XP Wallet</Text>
      </View>

      <FlatList
        data={events ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {walletLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
            ) : wallet ? (
              <View
                style={[styles.xpCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.levelRow}>
                  <View style={[styles.levelCircle, { backgroundColor: colors.primary }]}>
                    <Text style={styles.levelNumber}>{wallet.level}</Text>
                  </View>
                  <View>
                    <Text style={[styles.levelLabel, { color: colors.mutedForeground }]}>
                      Current Level
                    </Text>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>
                      {user?.displayName ?? "Builder"}
                    </Text>
                  </View>
                  <View style={[styles.xpBig, { backgroundColor: colors.muted }]}>
                    <Feather name="zap" size={16} color={colors.xpGold} />
                    <Text style={[styles.xpBigText, { color: colors.foreground }]}>
                      {wallet.xpBalance.toLocaleString()}
                    </Text>
                    <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>XP</Text>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.primary, width: `${xpProgress}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                      Level {wallet.level}
                    </Text>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                      {wallet.xpToNextLevel} XP to Lv{wallet.level + 1}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {events?.filter((e) => e.source === "proof_project").length ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      Proofs
                    </Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {events?.filter((e) => e.source === "bootcamp_completed").length ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      Bootcamps
                    </Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {events?.length ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      Events
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>XP History</Text>
          </>
        }
        ListEmptyComponent={
          eventsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Feather name="zap" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No XP events yet. Start posting!
              </Text>
            </View>
          )
        }
        renderItem={({ item }: { item: XpEvent }) => {
          const icon = SOURCE_ICONS[item.source] ?? "zap";
          const createdAt =
            item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
          return (
            <View
              style={[
                styles.eventRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.eventIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name={icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventSource, { color: colors.foreground }]}>
                  {SOURCE_LABELS[item.source] ?? item.source}
                </Text>
                {item.detail && (
                  <Text
                    style={[styles.eventDetail, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {item.detail}
                  </Text>
                )}
                <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                  {timeAgo(createdAt)}
                </Text>
              </View>
              <View style={styles.eventXp}>
                <Feather name="zap" size={12} color={colors.xpGold} />
                <Text style={[styles.eventAmount, { color: colors.xpGold }]}>+{item.amount}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 10, paddingBottom: 100 },
  xpCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    gap: 16,
  },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: { color: "#fff", fontSize: 22, fontWeight: "800" },
  levelLabel: { fontSize: 11, fontWeight: "500" },
  memberName: { fontSize: 16, fontWeight: "700" },
  xpBig: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  xpBigText: { fontSize: 20, fontWeight: "800" },
  xpLabel: { fontSize: 11, fontWeight: "600" },
  progressSection: { gap: 6 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%" as `${number}%`, borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, alignItems: "center", padding: 10, borderRadius: 12, gap: 2 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, textAlign: "center" },
  historyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfo: { flex: 1, gap: 2 },
  eventSource: { fontSize: 14, fontWeight: "600" },
  eventDetail: { fontSize: 12 },
  eventTime: { fontSize: 11 },
  eventXp: { flexDirection: "row", alignItems: "center", gap: 3 },
  eventAmount: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
