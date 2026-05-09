import React, { useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@workspace/supabase";

const LOGO = require("../../assets/images/icon.png");

type ExtChannel = {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  bootcampId?: string | null;
  parentChannelId?: string | null;
};

interface Section {
  title: string;
  data: ExtChannel[];
}

const CHANNEL_ICON_COLORS: Record<string, string> = {
  general: "#6366F1",
  introductions: "#10B981",
  builds: "#F59E0B",
  feedback: "#EF4444",
  resources: "#8B5CF6",
};

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");

  const { data: channels, isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("name");
      if (error) {
        console.error("Supabase Channels Error:", error);
        return [];
      }
      return (data || []).map((c: any) => ({
        ...c,
        bootcampId: c.bootcamp_id,
        parentChannelId: c.parent_channel_id,
      }));
    },
  });

  const sections = useMemo<Section[]>(() => {
    const all = (channels ?? []) as ExtChannel[];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? all.filter((c) => c.name.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q))
      : all;

    const communityChannels = filtered.filter((c) => !c.bootcampId && !c.parentChannelId);
    const bootcampRooms = filtered.filter((c) => c.bootcampId && !c.parentChannelId);
    const result: Section[] = [];
    if (communityChannels.length) result.push({ title: "Community", data: communityChannels });
    if (bootcampRooms.length) result.push({ title: "Bootcamp Rooms", data: bootcampRooms });
    return result;
  }, [channels, search]);

  const totalChannels = (channels ?? []).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header (matches home page) ── */}
      <View style={[styles.header, { paddingTop: topPadding + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Chat</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => router.push("/notifications" as never)}
              style={[styles.iconBtn, { backgroundColor: colors.muted }]}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={17} color={colors.mutedForeground} />
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
            placeholder="Search channels…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Online indicator strip ── */}
      {!isLoading && totalChannels > 0 && (
        <View style={[styles.onlineStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.onlineDot, { backgroundColor: "#10B981" }]} />
          <Text style={[styles.onlineText, { color: colors.mutedForeground }]}>
            {totalChannels} channel{totalChannels !== 1 ? "s" : ""} available
          </Text>
        </View>
      )}

      {/* ── Channel List ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, {
                backgroundColor: section.title === "Community" ? colors.primary : colors.xpGold,
              }]} />
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                {section.title.toUpperCase()}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                {section.data.length}
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const isCommunity = section.title === "Community";
            const iconColor = CHANNEL_ICON_COLORS[item.name] ?? colors.primary;

            return (
              <TouchableOpacity
                style={[styles.channelRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() =>
                  router.push(
                    isCommunity
                      ? `/channel/${item.id}`
                      : ({ pathname: "/bootcamp-hub/[id]", params: { id: item.id } } as never)
                  )
                }
                activeOpacity={0.75}
              >
                <View style={[styles.channelIcon, { backgroundColor: iconColor + "18" }]}>
                  <Feather
                    name={isCommunity ? "hash" : "book-open"}
                    size={16}
                    color={iconColor}
                  />
                </View>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelName, { color: colors.foreground }]} numberOfLines={1}>
                    {isCommunity ? `#${item.name}` : item.title ?? item.name}
                  </Text>
                  {item.description ? (
                    <Text style={[styles.channelDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : (
                    <Text style={[styles.channelDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {isCommunity ? "Community discussion" : "Bootcamp chat room"}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="message-circle" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search ? "No channels found" : "No channels yet"}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                {search ? "Try a different search term." : "Chat channels will appear here once they're created."}
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
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  // Online strip
  onlineStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 12, fontWeight: "500" },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    flex: 1,
  },
  sectionCount: { fontSize: 11, fontWeight: "600" },

  // Channel rows
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  channelInfo: { flex: 1, gap: 2 },
  channelName: { fontSize: 15, fontWeight: "600" },
  channelDesc: { fontSize: 12, lineHeight: 16 },

  // List
  listContent: { paddingBottom: 120 },
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