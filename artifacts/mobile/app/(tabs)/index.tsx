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
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PostCard } from "@/components/PostCard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useShare } from "@/hooks/useShare";
import { supabase } from "@workspace/supabase";

export interface Post {
  id: string;
  author_id: string;
  body: string;
  image_url?: string | null;
  track: string;
  is_proof_project: boolean;
  xp_awarded: number;
  proof_click_count: number;
  created_at: string;
  author?: {
    display_name: string;
    username: string;
    avatar_url?: string | null;
  };
  like_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

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

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ["posts", selectedTrack],
    queryFn: async () => {
      try {
        let query = supabase
          .from("posts")
          .select("*, author:profiles!author_id(*)")
          .order("created_at", { ascending: false });

        if (selectedTrack !== "all") {
          query = query.eq("track", selectedTrack);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as Post[];
      } catch (err) {
        console.error("Feed error:", err);
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["feed-summary"],
    queryFn: async () => {
      try {
        const { count: totalMembers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { count: postsToday } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString());
        
        return { totalMembers: totalMembers || 0, postsToday: postsToday || 0, activeMembersToday: 0 };
      } catch (err) {
        return { totalMembers: 0, postsToday: 0, activeMembersToday: 0 };
      }
    }
  });

  const handleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      try {
        const { data: existing } = await supabase
          .from("likes")
          .select("*")
          .eq("user_id", user.id)
          .eq("post_id", postId)
          .single();

        if (existing) {
          await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId);
        } else {
          await supabase.from("likes").insert({ user_id: user.id, post_id: postId });
          showToast({ type: "xp", title: "+2 XP Earned", message: "Thanks for engaging!" });
        }
        qc.invalidateQueries({ queryKey: ["posts"] });
      } catch (err) {
        console.error(err);
      }
    },
    [user, qc, showToast],
  );

  const handleBookmark = useCallback(
    async (postId: string) => {
      if (!user) return;
      try {
        const { data: existing } = await supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", user.id)
          .eq("post_id", postId)
          .single();

        if (existing) {
          await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
        } else {
          await supabase.from("bookmarks").insert({ user_id: user.id, post_id: postId });
        }
        qc.invalidateQueries({ queryKey: ["posts"] });
      } catch (err) {
        console.error(err);
      }
    },
    [user, qc],
  );

  const { sharePost } = useShare();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleShare = useCallback(
    (postId: string, body: string) => {
      void sharePost(postId, body);
    },
    [sharePost],
  );

  const handleProof = useCallback(
    async (postId: string) => {
      if (!user) return;
      try {
        // Increment proof count
        const { data: post } = await supabase.from("posts").select("proof_click_count").eq("id", postId).single();
        await supabase
          .from("posts")
          .update({ proof_click_count: (post?.proof_click_count || 0) + 1 })
          .eq("id", postId);

        qc.invalidateQueries({ queryKey: ["posts"] });
        showToast({ type: "success", title: "Proof recorded", message: "You tested this build!" });
      } catch (err) {
        console.error(err);
      }
    },
    [user, qc, showToast],
  );

  const topPadding = Platform.OS === "web" ? (isDesktop ? 0 : 16) : insets.top;

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
                    id={item.id}
                    body={item.body}
                    imageUrl={item.image_url}
                    track={item.track}
                    isProofProject={item.is_proof_project}
                    xpAwarded={item.xp_awarded}
                    likeCount={item.like_count || 0}
                    commentCount={0}
                    isLiked={item.is_liked || false}
                    isBookmarked={item.is_bookmarked || false}
                    proofClickCount={item.proof_click_count}
                    isProofClicked={false}
                    createdAt={item.created_at}
                    author={{
                      id: (item.author as any)?.id || item.author_id,
                      displayName: item.author?.display_name || "Unknown",
                      username: item.author?.username || "unknown",
                      avatarUrl: item.author?.avatar_url,
                      level: (item.author as any)?.purchased_level || 1,
                      track: (item.author as any)?.track || "frontend"
                    }}
                    onLike={() => handleLike(item.id)}
                    onBookmark={() => handleBookmark(item.id)}
                    onProof={() => { void handleProof(item.id); }}
                    onComment={() => router.push({ pathname: "/comments/[postId]", params: { postId: item.id } } as never)}
                    onShare={() => handleShare(item.id, item.body)}
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
              id={item.id}
              body={item.body}
              imageUrl={item.image_url}
              track={item.track}
              isProofProject={item.is_proof_project}
              xpAwarded={item.xp_awarded}
              likeCount={item.like_count || 0}
              commentCount={0}
              isLiked={item.is_liked || false}
              isBookmarked={item.is_bookmarked || false}
              proofClickCount={item.proof_click_count}
              isProofClicked={false}
              createdAt={item.created_at}
              author={{
                id: (item.author as any)?.id || item.author_id,
                display_name: item.author?.display_name || "Unknown",
                username: item.author?.username || "unknown",
                avatar_url: item.author?.avatar_url,
                level: (item.author as any)?.purchased_level || 1,
                track: (item.author as any)?.track || "frontend"
              }}
              onLike={() => handleLike(item.id)}
              onBookmark={() => handleBookmark(item.id)}
              onProof={() => { void handleProof(item.id); }}
              onComment={() => router.push({ pathname: "/comments/[postId]", params: { postId: item.id } } as never)}
              onShare={() => handleShare(item.id, item.body)}
            />
          )}
        />
      )}
      
      {/* Floating Action Button (Mobile) */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 80 }]} 
        activeOpacity={0.8}
        onPress={() => router.push("/(tabs)/create" as never)}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
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
  list: { paddingTop: 12, paddingBottom: 120 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

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
