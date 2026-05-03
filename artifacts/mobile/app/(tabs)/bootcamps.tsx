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
import { getListBootcampsQueryOptions, type Bootcamp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

const DIFFICULTY_FILTERS = ["beginner", "intermediate", "advanced"];

export default function BootcampsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 0 : 16) : insets.top;

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const { data: bootcamps, isLoading, refetch, isRefetching } = useQuery(getListBootcampsQueryOptions());

  const filtered = useMemo(() => {
    const list = bootcamps ?? [];
    return list.filter((b) => {
      const matchSearch = !search.trim() || b.title.toLowerCase().includes(search.toLowerCase()) || b.subtitle?.toLowerCase().includes(search.toLowerCase());
      const matchDifficulty = !difficulty || b.difficulty === difficulty;
      return matchSearch && matchDifficulty;
    });
  }, [bootcamps, search, difficulty]);

  const SearchBar = (
    <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
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
  );

  const FilterPills = (
    <View style={[styles.filterRow, isDesktop && styles.filterRowDesktop]}>
      {DIFFICULTY_FILTERS.map((d) => {
        const isActive = difficulty === d;
        const accentColor = DIFFICULTY_COLORS[d] ?? colors.primary;
        return (
          <TouchableOpacity
            key={d}
            onPress={() => setDifficulty(isActive ? "" : d)}
            style={[
              styles.filterPill,
              isDesktop && styles.filterPillDesktop,
              {
                backgroundColor: isActive ? accentColor : colors.muted,
                borderColor: isActive ? accentColor : colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <View style={[styles.difficultyDot, { backgroundColor: isActive ? "#fff" : accentColor }]} />
            <Text style={[styles.filterPillText, { color: isActive ? "#fff" : colors.mutedForeground }]}>{DIFFICULTY_LABELS[d]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const EmptyState = (
    <View style={styles.empty}>
      <Feather name={search || difficulty ? "search" : "book"} size={40} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {search || difficulty ? "No bootcamps found" : "No bootcamps yet"}
      </Text>
      <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
        {search || difficulty ? "Try a different search or filter" : "Check back soon"}
      </Text>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.desktopTopBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <View>
            <Text style={[styles.desktopPageTitle, { color: colors.foreground }]}>Bootcamps</Text>
            <Text style={[styles.desktopPageSub, { color: colors.mutedForeground }]}>
              {bootcamps ? `${bootcamps.length} bootcamps available` : "Ship skills. Earn XP."}
            </Text>
          </View>
        </View>
        <View style={styles.desktopBody}>
          <View style={[styles.desktopFilterCol, { borderRightColor: colors.border }]}>
            <Text style={[styles.filterColTitle, { color: colors.mutedForeground }]}>SEARCH</Text>
            {SearchBar}
            <Text style={[styles.filterColTitle, { color: colors.mutedForeground, marginTop: 20 }]}>DIFFICULTY</Text>
            {FilterPills}
            {difficulty && (
              <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.muted }]} onPress={() => setDifficulty("")} activeOpacity={0.8}>
                <Feather name="x" size={13} color={colors.mutedForeground} />
                <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.desktopGridCol}>
            {isLoading ? (
              <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : filtered.length === 0 ? (
              EmptyState
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(b) => b.id}
                numColumns={2}
                key="desktop-grid"
                contentContainerStyle={styles.desktopGrid}
                columnWrapperStyle={styles.desktopGridRow}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
                renderItem={({ item }: { item: Bootcamp & { priceCents?: number } }) => (
                  <View style={styles.desktopCardWrap}>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                      <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Bootcamps</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Ship skills. Earn XP.</Text>
        </View>
        {SearchBar}
        {FilterPills}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          key="mobile-list"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={EmptyState}
          renderItem={({ item }: { item: Bootcamp & { priceCents?: number } }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  headerTop: { gap: 2 },
  headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13 },
  list: { paddingTop: 12, paddingBottom: 100 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterRowDesktop: { flexDirection: "column", gap: 8 },
  filterPill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterPillDesktop: { flex: 0, justifyContent: "flex-start", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  difficultyDot: { width: 7, height: 7, borderRadius: 4 },
  filterPillText: { fontSize: 11, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySub: { fontSize: 14 },
  desktopTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 32, paddingVertical: 18, borderBottomWidth: 1 },
  desktopPageTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  desktopPageSub: { fontSize: 13, marginTop: 2 },
  desktopBody: { flex: 1, flexDirection: "row" },
  desktopFilterCol: { width: 220, borderRightWidth: 1, padding: 20, gap: 10 },
  filterColTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, marginTop: 4, alignSelf: "flex-start" },
  clearBtnText: { fontSize: 12, fontWeight: "600" },
  desktopGridCol: { flex: 1 },
  desktopGrid: { padding: 24, paddingBottom: 60 },
  desktopGridRow: { gap: 16, marginBottom: 16 },
  desktopCardWrap: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 13 },
});