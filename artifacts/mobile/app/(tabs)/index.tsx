import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getListPostsQueryOptions,
  getListPostsQueryKey,
  useLikePost,
  useBookmarkPost,
  getGetFeedSummaryQueryOptions,
  getGetFeedSummaryQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { PostCard } from "@/components/PostCard";
import type { Post } from "@workspace/api-client-react";

const LOGO = require("../../assets/images/icon.png");

const TRACKS = ["all", "product_design", "frontend", "growth", "branding", "mentorship"];
const TRACK_LABELS: Record<string, string> = {
  all: "All",
  product_design: "Design",
  frontend: "Frontend",
  growth: "Growth",
  branding: "Branding",
  mentorship: "Mentor",
};

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const params = selectedTrack !== "all" ? { track: selectedTrack } : {};

  const { data, isLoading, refetch } = useQuery(getListPostsQueryOptions(params));
  const { data: summary } = useQuery(getGetFeedSummaryQueryOptions());

  const likePost = useLikePost();
  const bookmarkPost = useBookmarkPost();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLike = useCallback(
    (postId: string) => {
      likePost.mutate({ postId }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPostsQueryKey(params) });
        },
      });
    },
    [likePost, qc, params],
  );

  const handleBookmark = useCallback(
    (postId: string) => {
      bookmarkPost.mutate({ postId }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPostsQueryKey(params) });
        },
      });
    },
    [bookmarkPost, qc, params],
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed header */}
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
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Zero Club</Text>
          <View style={styles.headerRight}>
            {summary && (
              <View style={[styles.liveChip, { backgroundColor: colors.primary + "22" }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.liveText, { color: colors.primary }]}>
                  {summary.activeMembersToday} active
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Track filter */}
        <FlatList
          data={TRACKS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t}
          contentContainerStyle={styles.trackFilters}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedTrack(item)}
              style={[
                styles.trackFilter,
                { backgroundColor: selectedTrack === item ? colors.primary : colors.muted },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.trackFilterText,
                  { color: selectedTrack === item ? "#fff" : colors.mutedForeground },
                ]}
              >
                {TRACK_LABELS[item] ?? item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Posts */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data?.posts ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="activity" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Be the first to share a build
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Post }) => (
            <PostCard
              {...item}
              onLike={() => handleLike(item.id)}
              onBookmark={() => handleBookmark(item.id)}
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
    paddingBottom: 8,
  },
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
  headerRight: { flexDirection: "row", gap: 8 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: "600" },
  trackFilters: { paddingHorizontal: 16, gap: 8 },
  trackFilter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  trackFilterText: { fontSize: 12, fontWeight: "600" },
  list: { paddingTop: 12, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptyText: { fontSize: 14 },
});
