import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  getListChannelsQueryOptions,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import type { Channel } from "@workspace/api-client-react";

const CHANNEL_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  general: "hash",
  design: "pen-tool",
  frontend: "code",
  wins: "award",
  branding: "star",
  growth: "trending-up",
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

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: channels, isLoading } = useQuery(getListChannelsQueryOptions());

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Chat</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Club channels</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={channels ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No channels yet</Text>
            </View>
          }
          renderItem={({ item }: { item: Channel }) => {
            const iconName = CHANNEL_ICONS[item.name] ?? "hash";
            const lastAt =
              item.lastMessageAt instanceof Date
                ? item.lastMessageAt.toISOString()
                : (item.lastMessageAt as string | null | undefined);
            return (
              <TouchableOpacity
                style={[
                  styles.channelRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push(`/channel/${item.id}`)}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name={iconName} size={18} color={colors.primary} />
                </View>
                <View style={styles.channelInfo}>
                  <View style={styles.channelNameRow}>
                    <Text style={[styles.channelName, { color: colors.foreground }]}>
                      #{item.name}
                    </Text>
                    {lastAt && (
                      <Text style={[styles.channelTime, { color: colors.mutedForeground }]}>
                        {timeAgo(lastAt)}
                      </Text>
                    )}
                  </View>
                  {(item.lastMessage ?? item.description) ? (
                    <Text
                      style={[styles.lastMessage, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {item.lastMessage ?? item.description}
                    </Text>
                  ) : null}
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
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 100 },
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
  channelNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  channelName: { fontSize: 15, fontWeight: "600" },
  channelTime: { fontSize: 11 },
  lastMessage: { fontSize: 13, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
});
