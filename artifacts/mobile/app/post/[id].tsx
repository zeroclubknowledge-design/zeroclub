import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Video, ResizeMode } from "expo-av";
import { BlurView } from "expo-blur";

import { supabase } from "@workspace/supabase";
import { useAuth } from "../../context/AuthContext";
import { useColors } from "../../hooks/useColors";
import { useToast } from "../../context/ToastContext";
import { useDialog } from "../../context/DialogContext";

const TRACK_LABELS: Record<string, string> = {
  product_design: "Product Design",
  frontend: "Frontend",
  growth: "Growth",
  branding: "Branding",
  mentorship: "Mentorship",
  backend: "Backend",
  full_stack: "Full Stack",
  vibe_coding: "Vibe Coding",
  video_editing: "Video Editing",
  motion_design: "Motion Design",
};

// --- Helpers ---
function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|avi|m4v|mkv|3gp)(\?.*)?$/i.test(url);
}

// --- Components ---
const SkeletonItem = ({ width, height, borderRadius = 8, style }: any) => {
  const colors = useColors();
  return (
    <View 
      style={[
        { width, height, borderRadius, backgroundColor: colors.muted + "40" },
        style
      ]} 
    />
  );
};

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const qc = useQueryClient();
  const videoRef = useRef<Video>(null);

  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const initials = (name?: string) => {
    if (!name || typeof name !== "string") return "?";
    return name.slice(0, 1).toUpperCase();
  };

  // 1. Fetch Post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("*, author:profiles!author_id(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 60000,
  });

  // 2. Fetch Comments
  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("comments")
        .select("*, author:profiles!author_id(*)")
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const isLoading = postLoading && !post;

  const handleComment = async () => {
    if (!commentText.trim() || !id || !user?.id) return;
    const body = commentText.trim();
    setCommentText("");
    setSendingComment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: id,
        author_id: user.id,
        body,
      });
      if (error) throw error;
      refetchComments();
      showToast({ type: "success", title: "Comment posted" });
    } catch (err: any) {
      showToast({ type: "error", title: "Could not post", message: err.message });
      setCommentText(body);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = () => {
    showDialog({
      title: "Delete Post",
      message: "This action cannot be undone. You will lose the XP earned.",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              // 1. Delete associated media from storage if it exists
              const mediaUrl = post.image_url || post.imageUrl;
              if (mediaUrl) {
                const pathParts = mediaUrl.split("/uploads/");
                if (pathParts.length > 1) {
                  const filePath = pathParts[1];
                  console.log("Cleaning up storage:", filePath);
                  await supabase.storage.from("uploads").remove([filePath]);
                }
              }

              // 2. Delete post record
              const { error } = await supabase.from("posts").delete().eq("id", id);
              if (error) {
                console.error("Supabase Delete Error:", error);
                showToast({ 
                  type: "error", 
                  title: "Delete Failed", 
                  message: error.message || "You don't have permission to delete this post." 
                });
                return;
              }

              // Manually remove from all posts queries (all tracks)
              qc.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
                if (Array.isArray(old)) {
                  return old.filter((p: any) => p.id !== id);
                }
                return old;
              });

              await qc.invalidateQueries({ queryKey: ["posts"] });
              showToast({ type: "success", title: "Post and media deleted" });
              router.back();
            } catch (err: any) {
              console.error("Catch Delete Error:", err);
              showToast({ type: "error", title: "Could not delete", message: err.message });
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    });
  };

  const handleSaveEdit = async () => {
    if (!editBody.trim() || !id) return;
    setSavingEdit(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ body: editBody.trim() })
        .eq("id", id);
      if (error) throw error;
      
      qc.invalidateQueries({ queryKey: ["post", id] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      showToast({ type: "success", title: "Changes saved" });
      setIsEditing(false);
    } catch (err: any) {
      showToast({ type: "error", title: "Could not save", message: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // --- Render Sections ---

  const renderFloatingActions = () => (
    <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
      <TouchableOpacity 
        style={[styles.floatingBtn, { backgroundColor: colors.background + "D9", borderColor: colors.border }]} 
        onPress={() => isEditing ? setIsEditing(false) : handleBack()}
      >
        <Feather name={isEditing ? "x" : "arrow-left"} size={20} color={colors.foreground} />
      </TouchableOpacity>
      
      <View style={{ flex: 1 }} />

      {isEditing ? (
        <TouchableOpacity 
          style={[styles.floatingBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={handleSaveEdit}
          disabled={savingEdit}
        >
          {savingEdit ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="check" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.floatingBtn, { backgroundColor: colors.background + "D9", borderColor: colors.border }]}
          onPress={() => {
            showDialog({
              title: "Options",
              buttons: [
                ...(user?.id === (post as any)?.author_id ? [
                  { 
                    text: "Edit Post", 
                    onPress: () => {
                      setEditBody(post.body);
                      setIsEditing(true);
                    } 
                  },
                  { 
                    text: "Delete Post", 
                    style: "destructive" as const, 
                    onPress: handleDelete 
                  }
                ] : []),
                { text: "Cancel", style: "cancel" }
              ]
            });
          }}
        >
          <Feather name="more-vertical" size={20} color={colors.foreground} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderFloatingActions()}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.authorRow}>
            <SkeletonItem width={48} height={48} borderRadius={24} />
            <View style={{ gap: 6 }}>
              <SkeletonItem width={120} height={16} />
              <SkeletonItem width={80} height={12} />
            </View>
          </View>
          <SkeletonItem width="100%" height={24} style={{ marginTop: 24 }} />
          <SkeletonItem width="90%" height={24} style={{ marginTop: 8 }} />
          <SkeletonItem width="100%" height={300} borderRadius={20} style={{ marginTop: 24 }} />
        </ScrollView>
      </View>
    );
  }

  if (!post && !postLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginTop: 16, fontSize: 16 }}>Post not found</Text>
        <TouchableOpacity style={{ marginTop: 24 }} onPress={handleBack}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = post as any;
  const author = p.author;
  const mediaUrl = p.image_url || p.imageUrl;
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  
  // Debug: If media exists but isn't showing, we want to know
  if (mediaUrl) {
    console.log("Post Media Found:", mediaUrl);
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {renderFloatingActions()}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Author info will start here */}

        {/* Author */}
        <TouchableOpacity 
          style={styles.authorRow}
          onPress={() => router.push({ pathname: "/user/[id]", params: { id: author?.id } } as never)}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {author?.avatar_url ? (
              <Image source={{ uri: author.avatar_url }} style={styles.fullImage} />
            ) : (
              <Text style={styles.avatarText}>{initials(author?.display_name || author?.username)}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: colors.foreground }]}>
              {author?.display_name || author?.username || "Unknown"}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              @{author?.username || "unknown"} · {timeAgo(p.created_at)}
            </Text>
          </View>
          <View style={[styles.xpBadge, { backgroundColor: colors.xpGold + "15" }]}>
            <Feather name="zap" size={12} color={colors.xpGold} />
            <Text style={[styles.xpText, { color: colors.xpGold }]}>+{p.xp_awarded || 0} XP</Text>
          </View>
        </TouchableOpacity>

        {/* Content */}
        {isEditing ? (
          <View style={[styles.editContainer, { borderColor: colors.primary }]}>
            <TextInput
              style={[styles.editInput, { color: colors.foreground }]}
              value={editBody}
              onChangeText={setEditBody}
              multiline
              autoFocus
              placeholder="What's on your mind?"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        ) : (
          <Text style={[styles.postBody, { color: colors.foreground }]}>{p.body}</Text>
        )}

        {/* Media */}
        {mediaUrl && (
          <View style={[styles.mediaContainer, { borderColor: colors.border }]}>
            {isVideo ? (
              Platform.OS === "web" ? (
                <video 
                  src={mediaUrl} 
                  controls 
                  autoPlay 
                  muted 
                  loop 
                  style={{ width: "100%", height: 350, objectFit: "cover", backgroundColor: "#000" }} 
                />
              ) : (
                <Video
                  ref={videoRef}
                  source={{ uri: mediaUrl }}
                  style={{ width: "100%", height: 350 }}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isMuted
                  isLooping
                />
              )
            ) : (
              <Image 
                source={{ uri: mediaUrl }} 
                style={{ width: "100%", height: 350, backgroundColor: "#111" }} 
                resizeMode="cover" 
              />
            )}
          </View>
        )}

        {/* Interaction Bar */}
        <View style={[styles.interactionBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.interactionItem}>
            <Feather name="heart" size={18} color={colors.mutedForeground} />
            <Text style={[styles.interactionText, { color: colors.foreground }]}>{p.like_count || 0}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.interactionItem}>
            <Feather name="message-circle" size={18} color={colors.mutedForeground} />
            <Text style={[styles.interactionText, { color: colors.foreground }]}>{comments?.length || 0}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.interactionItem}>
            <Feather name="share-2" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsWrap}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Discussion</Text>
          
          {commentsLoading && comments?.length === 0 ? (
            <View style={{ gap: 12 }}>
              <SkeletonItem width="100%" height={80} borderRadius={16} />
              <SkeletonItem width="100%" height={80} borderRadius={16} />
            </View>
          ) : comments?.length === 0 ? (
            <View style={styles.emptyComments}>
              <Feather name="message-square" size={32} color={colors.mutedForeground + "40"} />
              <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>Be the first to comment</Text>
            </View>
          ) : (
            comments?.map((c: any) => (
              <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.commentHeader}>
                  <View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}>
                    {c.author?.avatar_url ? (
                      <Image source={{ uri: c.author.avatar_url }} style={styles.fullImage} />
                    ) : (
                      <Text style={styles.smallAvatarText}>{initials(c.author?.display_name || c.author?.username)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
                      {c.author?.display_name || c.author?.username || "Anon"}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{timeAgo(c.created_at)}</Text>
                  </View>
                </View>
                <Text style={[styles.commentBody, { color: colors.foreground }]}>{c.body}</Text>
              </View>
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Input Footer */}
      <BlurView 
        intensity={Platform.OS === "ios" ? 90 : 100} 
        tint={colors.background === "#000" ? "dark" : "light"}
        style={[styles.inputFooter, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}
      >
        <View style={[styles.inputWrapper, { backgroundColor: colors.muted + "90", borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Write a comment..."
            placeholderTextColor={colors.mutedForeground}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
        </View>
        <TouchableOpacity 
          style={[styles.sendBtn, { backgroundColor: colors.primary }]} 
          onPress={handleComment}
          disabled={sendingComment || !commentText.trim()}
        >
          {sendingComment ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20 },
  floatingHeader: {
    position: "absolute",
    top: 40, // We'll adjust this with insets in render
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 100,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  authorRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 60 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  authorName: { fontSize: 17, fontWeight: "700" },
  xpBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  xpText: { fontSize: 11, fontWeight: "800" },
  
  postBody: { fontSize: 18, lineHeight: 28, marginTop: 20, fontFamily: "Inter_400Regular" },
  editContainer: { 
    marginTop: 20, 
    borderRadius: 20, 
    borderWidth: 2, 
    padding: 16, 
    backgroundColor: "rgba(0,0,0,0.05)" 
  },
  editInput: { fontSize: 18, lineHeight: 28, fontFamily: "Inter_400Regular", minHeight: 120, textAlignVertical: "top" },
  mediaContainer: { marginTop: 20, borderRadius: 24, borderWidth: 1, overflow: "hidden", backgroundColor: "#000" },
  fullImage: { width: "100%", height: "100%" },
  
  interactionBar: { 
    flexDirection: "row", 
    marginTop: 24, 
    borderRadius: 20, 
    borderWidth: 1, 
    padding: 14, 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  interactionItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  interactionText: { fontSize: 14, fontWeight: "700" },
  divider: { width: 1, height: 20 },
  
  commentsWrap: { marginTop: 32 },
  sectionTitle: { fontSize: 20, fontWeight: "900", marginBottom: 20, letterSpacing: -0.5 },
  emptyComments: { padding: 40, alignItems: "center", justifyContent: "center" },
  commentCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  smallAvatarText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  commentAuthor: { fontSize: 14, fontWeight: "700" },
  commentBody: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  
  inputFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  input: { paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", elevation: 2 },
});
