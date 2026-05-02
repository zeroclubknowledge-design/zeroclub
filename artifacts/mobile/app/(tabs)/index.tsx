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
import { router } from "expo-router";
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
import { useAuth } from "@/context/AuthContext";
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
  const { user } = useAuth();
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
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={[styles.avatarBtn, { backgroundColor: colors.primary + "22" }]}
              activeOpacity={0.7}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                  {(user?.displayName ?? "U").slice(0, 1).toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
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
  trackFilters: { paddingHorizontal: 16, gap: 8 },
  trackFilter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  trackFilterText: { fontSize: 12, fontWeight: "600" },
  list: { paddingTop: 12, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptyText: { fontSize: 14 },
});
