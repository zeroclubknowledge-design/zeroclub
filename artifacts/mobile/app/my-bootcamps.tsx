import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import {
  getListBootcampsQueryOptions,
} from "@workspace/api-client-react";
import type { Bootcamp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { BootcampCard } from "@/components/BootcampCard";

const FILTER_OPTIONS = [
  { id: "all", label: "All Enrolled" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
] as const;

type FilterId = (typeof FILTER_OPTIONS)[number]["id"];

export default function MyBootcampsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const [filter, setFilter] = React.useState<FilterId>("all");

  const { data: bootcamps, isLoading } = useQuery(getListBootcampsQueryOptions());

  // Only show bootcamps the user has enrolled in
  const enrolled = React.useMemo(() => {
    if (!bootcamps) return [];
    return bootcamps.filter((b) => b.enrolled);
  }, [bootcamps]);

  const filtered = React.useMemo(() => {
    if (filter === "all") return enrolled;
    if (filter === "in_progress") return enrolled.filter((b) => (b.enrollment?.progress ?? 0) < 100);
    if (filter === "completed") return enrolled.filter((b) => (b.enrollment?.progress ?? 0) === 100);
    return enrolled;
  }, [enrolled, filter]);

  const completedCount = enrolled.filter((b) => (b.enrollment?.progress ?? 0) === 100).length;
  const inProgressCount = enrolled.filter((b) => (b.enrollment?.progress ?? 0) < 100).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Bootcamps</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Summary strip */}
      {!isLoading && enrolled.length > 0 && (
        <View style={[styles.summaryStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: colors.foreground }]}>{enrolled.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Enrolled</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: colors.primary }]}>{inProgressCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>In Progress</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: "#10B981" }]}>{completedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Completed</Text>
          </View>
        </View>
      )}

      {/* Filter pills */}
      {!isLoading && enrolled.length > 0 && (
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === f.id ? colors.primary : colors.card,
                  borderColor: filter === f.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: filter === f.id ? "#fff" : colors.mutedForeground },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : enrolled.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="book" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bootcamps yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Enrol in a bootcamp and it will appear here so you can track your progress.
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/bootcamps" as never)}
            activeOpacity={0.85}
          >
            <Feather name="search" size={14} color="#fff" />
            <Text style={styles.browseBtnText}>Browse Bootcamps</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="filter" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bootcamps here</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Try a different filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: Bootcamp }) => (
            <BootcampCard
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              track={item.track}
              difficulty={item.difficulty}
              deliveryMedium={item.deliveryMedium ?? undefined}
              coverUrl={item.coverUrl}
              modulesCount={item.modulesCount}
              xpReward={item.xpReward}
              priceCents={item.priceCents}
              enrolled={true}
              progress={item.enrollment?.progress ?? 0}
              onPress={() =>
                router.push({ pathname: "/bootcamp/[id]", params: { id: item.id } } as never)
              }
            />
          )}
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
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  summaryStrip: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryCount: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontWeight: "500" },
  summaryDivider: { width: 1, marginVertical: 4 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 13, fontWeight: "600" },
  list: { paddingTop: 8, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
