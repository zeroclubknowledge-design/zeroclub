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
  ScrollView,
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
import { useToast } from "@/context/ToastContext";
import { PostCard } from "@/components/PostCard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { Post } from "@workspace/api-client-react";

const LOGO = require("../../assets/images/icon.png");

const TRACKS = ["all", "product_design", "frontend", "growth", "branding", "mentorship", "backend", "full_stack", "vibe_coding", "video_editing", "motion_design"];
const TRACK_LABELS: Record<string, string> = {
  all: "All",
  product_design: "Design",
  frontend: "Frontend",
  growth: "Growth",
  branding: "Branding",
  mentorship: "Mentor",
  backend: "Backend",
  full_stack: "Full Stack",
  vibe_coding: "Vibe",
  video_editing: "Video",
  motion_design: "Motion",
};

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const { isDesktop } = useBreakpoint();
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
          showToast({ type: "xp", title: "+2 XP Earned", message: "Thanks for engaging with the community!" });
        },
      });
    },
    [likePost, qc, params, showToast],
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

  const handleProof = useCallback(
    async (postId: string) => {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const baseUrl = domain ? `https://${domain}` : "";
      try {
        const res = await fetch(`${baseUrl}/api/posts/${postId}/proof`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (res.ok) {
          const json = await res.json() as { proofed: boolean };
          qc.invalidateQueries({ queryKey: getListPostsQueryKey(params) });
          if (json.proofed) {
            showToast({ type: "success", title: "Proof recorded", message: "You tested this build. The author gets +5 XP!" });
          }
        }
      } catch {
        // silent
      }
    },
    [token, qc, params, showToast],
  );

  const topPadding = Platform.OS === "web" ? (isDesktop ? 0 : 67) : insets.top;
  const posts = data?.posts ?? [];

  // ── Desktop Layout ──
  if (isDesktop) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Desktop top bar */}
        <View style={[styles.desktopTopBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <View>
            <Text style={[styles.desktopPageTitle, { color: colors.foreground }]}>Feed</Text>
            <Text style={[styles.desktopPageSub, { color: colors.mutedForeground }]}>
              {summary ? `${summary.postsToday ?? 0} posts today · ${summary.totalMembers ?? 0} builders` : "Latest from the community"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.desktopPostBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/create" as never)}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.desktopPostBtnText}>New Post</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.desktopBody}>
          {/* Feed column */}
          <View style={styles.desktopFeedCol}>
            {/* Track filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackFilters} style={styles.trackScroll}>
              {TRACKS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedTrack(t)}
                  style={[
                    styles.trackFilter,
                    { backgroundColor: selectedTrack === t ? colors.primary : colors.muted },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.trackFilterText, { color: selectedTrack === t ? "#fff" : colors.mutedForeground }]}>
                    {TRACK_LABELS[t] ?? t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isLoading ? (
              <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : (
              <FlatList
                data={posts}
                keyExtractor={(p) => p.id}
                contentContainerStyle={styles.desktopList}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Feather name="activity" size={40} color={colors.mutedForeground} />
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to share a build</Text>
                  </View>
                }
                renderItem={({ item }: { item: Post }) => (
                  <PostCard
                    {...item}
                    proofClickCount={(item as unknown as { proofClickCount?: number }).proofClickCount ?? 0}
                    isProofClicked={(item as unknown as { isProofClicked?: boolean }).isProofClicked ?? false}
                    onLike={() => handleLike(item.id)}
                    onBookmark={() => handleBookmark(item.id)}
                    onProof={() => { void handleProof(item.id); }}
                    onComment={() => router.push({ pathname: "/comments/[postId]", params: { postId: item.id } } as never)}
                  />
                )}
              />
            )}
          </View>

          {/* Right sidebar */}
          <View style={[styles.desktopSideCol, { borderLeftColor: colors.border }]}>
            {/* Stats widget */}
            {summary && (
              <View style={[styles.widget, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.foreground }]}>Community</Text>
                {[
                  { icon: "users" as const, label: "Builders", value: summary.totalMembers ?? 0, color: colors.primary },
                  { icon: "edit-3" as const, label: "Posts Today", value: summary.postsToday ?? 0, color: "#10B981" },
                  { icon: "zap" as const, label: "Active Today", value: summary.activeMembersToday ?? 0, color: colors.xpGold },
                ].map((s) => (
                  <View key={s.label} style={styles.widgetRow}>
                    <View style={[styles.widgetIcon, { backgroundColor: s.color + "20" }]}>
                      <Feather name={s.icon} size={14} color={s.color} />
                    </View>
                    <Text style={[styles.widgetLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                    <Text style={[styles.widgetValue, { color: colors.foreground }]}>{s.value.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Quick links */}
            <View style={[styles.widget, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.widgetTitle, { color: colors.foreground }]}>Quick Links</Text>
              {[
                { label: "My Bootcamps", icon: "book-open" as const, route: "/my-bootcamps" },
                { label: "Club Levels", icon: "award" as const, route: "/club-levels" },
                { label: "Referrals", icon: "user-plus" as const, route: "/referral" },
                { label: "Notifications", icon: "bell" as const, route: "/notifications" },
              ].map((l) => (
                <TouchableOpacity
                  key={l.label}
                  style={styles.quickLink}
                  onPress={() => router.push(l.route as never)}
                  activeOpacity={0.8}
                >
                  <Feather name={l.icon} size={15} color={colors.primary} />
                  <Text style={[styles.quickLinkText, { color: colors.foreground }]}>{l.label}</Text>
                  <Feather name="chevron-right" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile Layout ──
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Zero Club</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push("/notifications" as never)} style={[styles.bellBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
              <Feather name="bell" size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile")} style={[styles.avatarBtn, { backgroundColor: colors.primary + "22" }]} activeOpacity={0.7}>
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
        <FlatList
          data={TRACKS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t}
          contentContainerStyle={styles.trackFilters}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedTrack(item)}
              style={[styles.trackFilter, { backgroundColor: selectedTrack === item ? colors.primary : colors.muted }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.trackFilterText, { color: selectedTrack === item ? "#fff" : colors.mutedForeground }]}>
                {TRACK_LABELS[item] ?? item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="activity" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No posts yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to share a build</Text>
            </View>
          }
          renderItem={({ item }: { item: Post }) => (
            <PostCard
              {...item}
              proofClickCount={(item as unknown as { proofClickCount?: number }).proofClickCount ?? 0}
              isProofClicked={(item as unknown as { isProofClicked?: boolean }).isProofClicked ?? false}
              onLike={() => handleLike(item.id)}
              onBookmark={() => handleBookmark(item.id)}
              onProof={() => { void handleProof(item.id); }}
              onComment={() => router.push({ pathname: "/comments/[postId]", params: { postId: item.id } } as never)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Mobile
  header: { borderBottomWidth: 1, paddingBottom: 8 },
  headerTop: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  bellBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarInitials: { fontSize: 14, fontWeight: "700" },
  list: { paddingTop: 12, paddingBottom: 100 },

  // Shared
  trackFilters: { paddingHorizontal: 16, gap: 8 },
  trackFilter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  trackFilterText: { fontSize: 12, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptyText: { fontSize: 14 },

  // Desktop
  desktopTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  desktopPageTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  desktopPageSub: { fontSize: 13, marginTop: 2 },
  desktopPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  desktopPostBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  desktopBody: { flex: 1, flexDirection: "row" },
  desktopFeedCol: { flex: 1, maxWidth: 680 },
  trackScroll: { paddingVertical: 12 },
  desktopList: { paddingBottom: 60 },
  desktopSideCol: {
    width: 280,
    borderLeftWidth: 1,
    padding: 20,
    gap: 16,
  },
  widget: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  widgetTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  widgetRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  widgetIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  widgetLabel: { flex: 1, fontSize: 13 },
  widgetValue: { fontSize: 14, fontWeight: "700" },
  quickLink: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  quickLinkText: { flex: 1, fontSize: 14, fontWeight: "500" },
});
