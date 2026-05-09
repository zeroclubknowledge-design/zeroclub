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
  type?: "channel" | "room";
};

type ChatTab = "messages" | "channels" | "rooms";

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
  const [activeTab, setActiveTab] = React.useState<ChatTab>("messages");

  // 1. Fetch Channels & Rooms
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("name");
      if (error) return [];
      return (data || []).map((c: any) => ({
        ...c,
        bootcampId: c.bootcamp_id,
        parentChannelId: c.parent_channel_id,
        type: c.type || (c.bootcamp_id ? "room" : "channel")
      }));
    },
  });

  // 2. Fetch Followers & Top Ranked for Messages tab
  const { data: people, isLoading: peopleLoading } = useQuery({
    queryKey: ["chat_people"],
    queryFn: async () => {
      // Get followers
      const { data: follows } = await supabase
        .from("follows")
        .select("follower:profiles!follower_id(*)")
        .eq("following_id", user?.id);
      
      // Get top ranked (for premium access)
      const { data: topRanked } = await supabase
        .from("profiles")
        .select("*")
        .order("purchased_level", { ascending: false })
        .limit(10);
        
      const followersList = (follows || []).map(f => ({ ...f.follower, isFollower: true }));
      const topList = (topRanked || []).map(p => ({ ...p, isTopRanked: true }));
      
      // Merge and unique
      const combined = [...followersList, ...topList];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      return unique;
    },
    enabled: !!user?.id && activeTab === "messages"
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

        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabBar}>
          {(["messages", "channels", "rooms"] as ChatTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === tab ? colors.foreground : colors.mutedForeground }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Search bar ── */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
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

      {/* ── Main Content ── */}
      {activeTab === "messages" ? (
        <SectionList
          sections={[{ title: "Recent Chats", data: (people || []).filter(p => p.id !== user?.id) }]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.channelRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: "/channel/[id]", params: { id: item.id, title: item.display_name || item.username } } as never)}
            >
              <View style={[styles.channelIcon, { backgroundColor: colors.primary + "18" }]}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {(item.display_name || item.username || "U")[0].toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.channelInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.channelName, { color: colors.foreground }]}>
                    {item.display_name || item.username}
                  </Text>
                  {item.isTopRanked && (
                    <View style={{ backgroundColor: colors.xpGold + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: colors.xpGold, fontWeight: "700" }}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.channelDesc, { color: colors.mutedForeground }]}>
                  {item.isFollower ? "Follows you" : `Level ${item.purchased_level || 1} Builder`}
                </Text>
              </View>
              <Feather name="message-square" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="users" size={32} color={colors.mutedForeground} />
              <Text style={{ color: colors.foreground, marginTop: 12, fontWeight: "700" }}>No conversations yet</Text>
              <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>Followers and top builders will appear here.</Text>
            </View>
          }
        />
      ) : (
        <SectionList
          sections={sections.filter(s => activeTab === "channels" ? s.title === "Community" : s.title === "Bootcamp Rooms")}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
              >
                <View style={[styles.channelIcon, { backgroundColor: iconColor + "18" }]}>
                  <Feather name={isCommunity ? "hash" : "book-open"} size={16} color={iconColor} />
                </View>
                <View style={styles.channelInfo}>
                  <Text style={[styles.channelName, { color: colors.foreground }]}>
                    {isCommunity ? `#${item.name}` : item.title ?? item.name}
                  </Text>
                  <Text style={[styles.channelDesc, { color: colors.mutedForeground }]}>
                    {item.description || (isCommunity ? "Community discussion" : "Bootcamp chat room")}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
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
  
  // Tabs
  tabBar: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 20 },
  tab: { paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 15, fontWeight: "700" },

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