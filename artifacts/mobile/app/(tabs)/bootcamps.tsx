import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Image,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { BootcampCard } from "@/components/BootcampCard";
import { supabase } from "@workspace/supabase";
import { useAuth } from "@/context/AuthContext";

const LOGO = require("../../assets/images/icon.png");

const DIFFICULTY_FILTERS = ["all", "beginner", "intermediate", "advanced"];
const DIFFICULTY_LABELS: Record<string, string> = {
  all: "All",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function BootcampsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const { user } = useAuth();

  const { data: bootcamps, isLoading, refetch } = useQuery({
    queryKey: ["bootcamps", user?.id],
    queryFn: async () => {
      try {
        const { data: bData, error: bError } = await supabase
          .from("bootcamps")
          .select("*");

        if (bError) throw bError;

        let enrollments: any[] = [];
        if (user?.id) {
          const { data: eData, error: eError } = await supabase
            .from("enrollments")
            .select("*")
            .eq("user_id", user.id);
          if (!eError) enrollments = eData || [];
        }

        return (bData || []).map((b: any) => {
          const enrollment = enrollments.find((e: any) => e.bootcamp_id === b.id);
          return {
            ...b,
            enrolled: !!enrollment,
            enrollment: enrollment,
            deliveryMedium: b.delivery_medium,
            modulesCount: b.modules_count,
            xpReward: b.xp_reward,
            priceCents: b.price_cents,
            coverUrl: b.cover_url,
          };
        });
      } catch (err) {
        console.error("Bootcamps error:", err);
        return [];
      }
    },
  });

  const [search, setSearch] = React.useState("");
  const [selectedDifficulty, setSelectedDifficulty] = React.useState("all");

  const list = (bootcamps ?? []).filter((item: any) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [item.title, item.subtitle, item.track].some((v: string) => v?.toLowerCase().includes(q));
    const matchesDifficulty = selectedDifficulty === "all" || item.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const enrolledCount = (bootcamps ?? []).filter((b: any) => b.enrolled).length;
  const totalCount = (bootcamps ?? []).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header (matches home page) ── */}
      <View style={[styles.header, { paddingTop: topPadding + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Learn</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => router.push("/my-bootcamps" as never)}
              style={[styles.iconBtn, { backgroundColor: colors.muted }]}
              activeOpacity={0.7}
            >
              <Feather name="bookmark" size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={[styles.avatarBtn, { backgroundColor: colors.primary + "22" }]}
              activeOpacity={0.7}
             >
              {(user as any)?.avatar_url || (user as any)?.avatarUrl ? (
                <Image source={{ uri: (user as any)?.avatar_url || (user as any)?.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                  {((user as any)?.display_name || (user as any)?.displayName || "U").slice(0, 1).toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar ── */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bootcamps…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Difficulty filter pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {DIFFICULTY_FILTERS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setSelectedDifficulty(d)}
              style={[
                styles.filterPill,
                { backgroundColor: selectedDifficulty === d ? colors.primary : colors.muted },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: selectedDifficulty === d ? "#fff" : colors.mutedForeground },
                ]}
              >
                {DIFFICULTY_LABELS[d]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Stats strip ── */}
      {!isLoading && totalCount > 0 && (
        <View style={[styles.statsStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Bootcamps</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#10B981" }]}>{enrolledCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Enrolled</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.xpGold }]}>
              {(bootcamps ?? []).filter((b: any) => b.priceCents === 0).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Free</Text>
          </View>
        </View>
      )}

      {/* ── List ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => (
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
              enrolled={item.enrolled}
              progress={item.enrollment?.progress ?? 0}
              onPress={() => router.push({ pathname: "/bootcamp/[id]", params: { id: item.id } } as never)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="book-open" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bootcamps found</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                {search ? "Try a different search term." : "Check back soon for new learning tracks."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header (matching home page pattern)
  header: { borderBottomWidth: 1, paddingBottom: 10 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  logo: { width: 28, height: 28, borderRadius: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    fontFamily: "Inter_700Bold",
  },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarInitials: { fontSize: 14, fontWeight: "700" },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  // Filter pills
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 2 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterPillText: { fontSize: 12, fontWeight: "600" },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1, marginVertical: 2 },

  // List
  list: { paddingTop: 8, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Empty
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
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
});