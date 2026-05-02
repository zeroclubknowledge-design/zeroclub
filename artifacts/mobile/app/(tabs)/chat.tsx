import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { getListChannelsQueryOptions } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import type { Channel } from "@workspace/api-client-react";

type ExtChannel = Channel & {
  bootcampId?: string | null;
  parentChannelId?: string | null;
  title?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  subChannelCount?: number;
};

const CHANNEL_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  general: "hash",
  design: "pen-tool",
  frontend: "code",
  wins: "award",
  branding: "star",
  growth: "trending-up",
  backend: "server",
  mentorship: "users",
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Section {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  data: ExtChannel[];
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [search, setSearch] = useState("");

  const { data: channels, isLoading } = useQuery(getListChannelsQueryOptions());

  const sections = useMemo<Section[]>(() => {
    const all = (channels ?? []) as ExtChannel[];
    const q = search.toLowerCase().trim();

    const communityChannels = all.filter(
      (c) => !c.bootcampId && !c.parentChannelId,
    );
    const bootcampHubs = all.filter(
      (c) => c.bootcampId && !c.parentChannelId,
    );

    const filteredCommunity = q
      ? communityChannels.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q),
        )
      : communityChannels;

    const filteredBootcamp = q
      ? bootcampHubs.filter(
          (c) =>
            (c.title ?? c.name).toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q),
        )
      : bootcampHubs;

    const result: Section[] = [];
    if (filteredCommunity.length > 0) {
      result.push({ title: "Community", icon: "hash", data: filteredCommunity });
    }
    if (filteredBootcamp.length > 0) {
      result.push({ title: "Bootcamp Rooms", icon: "book-open", data: filteredBootcamp });
    }
    return result;
  }, [channels, search]);

  const renderCommunityRow = (item: ExtChannel) => {
    const iconName = CHANNEL_ICONS[item.name] ?? "hash";
    const lastAt = item.lastMessageAt as string | null | undefined;
    return (
      <TouchableOpacity
        style={[styles.channelRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/channel/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={[styles.channelIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name={iconName} size={18} color={colors.primary} />
        </View>
        <View style={styles.channelInfo}>
          <View style={styles.channelNameRow}>
            <Text style={[styles.channelName, { color: colors.foreground }]}>#{item.name}</Text>
            {lastAt && (
              <Text style={[styles.channelTime, { color: colors.mutedForeground }]}>
                {timeAgo(lastAt)}
              </Text>
            )}
          </View>
          {(item.lastMessage ?? item.description) ? (
            <Text style={[styles.lastMessage, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.lastMessage ?? item.description}
            </Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  };

  const renderBootcampRow = (item: ExtChannel) => {
    const lastAt = item.lastMessageAt as string | null | undefined;
    const subCount = item.subChannelCount ?? 0;
    return (
      <TouchableOpacity
        style={[styles.bootcampRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() =>
          router.push({
            pathname: "/bootcamp-hub/[id]",
            params: { id: item.id, bootcampTitle: item.title ?? item.name },
          } as never)
        }
        activeOpacity={0.8}
      >
        <View style={[styles.bootcampIconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="book-open" size={20} color={colors.primary} />
        </View>
        <View style={styles.bootcampInfo}>
          <View style={styles.bootcampNameRow}>
            <Text style={[styles.bootcampName, { color: colors.foreground }]} numberOfLines={1}>
              {item.title ?? item.name}
            </Text>
            {lastAt && (
              <Text style={[styles.channelTime, { color: colors.mutedForeground }]}>
                {timeAgo(lastAt)}
              </Text>
            )}
          </View>
          <View style={styles.bootcampMeta}>
            {item.description && (
              <Text
                style={[styles.bootcampDesc, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            )}
          </View>
          <View style={styles.subChannelPills}>
            {["General", "Show & Tell", "Resources", "Feedback"].map((label, i) => (
              <View
                key={i}
                style={[styles.subChannelPill, { backgroundColor: colors.muted }]}
              >
                <Text style={[styles.subChannelPillText, { color: colors.mutedForeground }]}>
                  #{label.toLowerCase().replace(" & ", "-")}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
      </TouchableOpacity>
    );
  };

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Chat</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Club channels
          </Text>
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search channels..."
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
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search ? "No channels found" : "No channels yet"}
              </Text>
              {search && (
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Try a different search term
                </Text>
              )}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Feather name={section.icon} size={14} color={colors.mutedForeground} />
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                {section.title.toUpperCase()}
              </Text>
              <View style={[styles.sectionCount, { backgroundColor: colors.muted }]}>
                <Text style={[styles.sectionCountText, { color: colors.mutedForeground }]}>
                  {section.data.length}
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item, section }) =>
            section.title === "Bootcamp Rooms"
              ? renderBootcampRow(item)
              : renderCommunityRow(item)
          }
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingTop: 14,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, flex: 1 },
  sectionCount: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 },
  sectionCountText: { fontSize: 10, fontWeight: "700" },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  channelIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  channelInfo: { flex: 1 },
  channelNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  channelName: { fontSize: 15, fontWeight: "600" },
  channelTime: { fontSize: 11 },
  lastMessage: { fontSize: 13, marginTop: 2 },
  bootcampRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  bootcampIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  bootcampInfo: { flex: 1, gap: 4 },
  bootcampNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bootcampName: { fontSize: 15, fontWeight: "700", flex: 1 },
  bootcampMeta: {},
  bootcampDesc: { fontSize: 12 },
  subChannelPills: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
  subChannelPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subChannelPillText: { fontSize: 10, fontWeight: "500" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySub: { fontSize: 14 },
});
