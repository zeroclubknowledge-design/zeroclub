import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getListBootcampsQueryOptions,
  type Bootcamp,
  BootcampDifficulty,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { BootcampCard } from "@/components/BootcampCard";

const DIFFICULTY_LABELS: Record<string, string> = {
  all: "All",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

const DIFFICULTY_FILTERS = ["all", "beginner", "intermediate", "advanced"];

export default function BootcampsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");

  const { data: bootcamps, isLoading, refetch, isRefetching } = useQuery(
    getListBootcampsQueryOptions(),
  );

  const filtered = useMemo(() => {
    if (!bootcamps) return [];
    return bootcamps.filter((b) => {
      const matchSearch =
        !search.trim() ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.subtitle?.toLowerCase().includes(search.toLowerCase());
      const matchDifficulty =
        difficulty === "all" || b.difficulty === difficulty;
      return matchSearch && matchDifficulty;
    });
  }, [bootcamps, search, difficulty]);

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
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Bootcamps
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Ship skills. Earn XP.
          </Text>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search bootcamps..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Difficulty filter pills */}
        <View style={styles.filterRow}>
          {DIFFICULTY_FILTERS.map((d) => {
            const isActive = difficulty === d;
            const accentColor =
              d === "all" ? colors.primary : DIFFICULTY_COLORS[d] ?? colors.primary;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDifficulty(d)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? accentColor : colors.muted,
                    borderColor: isActive ? accentColor : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                {d !== "all" && (
                  <View
                    style={[
                      styles.filterDot,
                      {
                        backgroundColor: isActive
                          ? "#fff"
                          : (DIFFICULTY_COLORS[d] ?? colors.mutedForeground),
                      },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {DIFFICULTY_LABELS[d]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather
                name={search || difficulty !== "all" ? "search" : "book"}
                size={40}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search || difficulty !== "all"
                  ? "No bootcamps found"
                  : "No bootcamps yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {search || difficulty !== "all"
                  ? "Try a different search or filter"
                  : "Check back soon"}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Bootcamp & { priceCents?: number } }) => (
            <BootcampCard
              {...item}
              priceCents={item.priceCents ?? 0}
              progress={item.enrollment?.progress ?? 0}
              onPress={() => router.push(`/bootcamp/${item.id}`)}
              onEnroll={() => router.push(`/bootcamp/${item.id}`)}
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
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  headerTop: { gap: 2 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerSub: { fontSize: 13 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterPillText: { fontSize: 12, fontWeight: "600" },
  list: { paddingTop: 12, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySub: { fontSize: 14 },
});
