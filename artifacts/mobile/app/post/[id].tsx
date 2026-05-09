import React, { useState, useRef } from "react";
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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Video, ResizeMode } from "expo-av";

import { supabase } from "../../lib/supabase";
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

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const qc = useQueryClient();
  const videoRef = useRef<Video>(null);

  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [deleting, setDeleting] = useState(false);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const initials = (name?: string) => {
    if (!name || typeof name !== "string") return "?";
    return name.slice(0, 1).toUpperCase();
  };

  // 1. Fetch Post Data with absolute safety
  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("*, author:profiles!author_id(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase Post Error:", error);
        throw error;
      }
      return data;
    },
    enabled: !!id,
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

      if (error) {
        console.error("Supabase Comments Error:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!id,
  });

  const isLoading = postLoading || (!!id && !post && postLoading);

  const handleComment = async () => {
    if (!commentText.trim() || !id || !user?.id) return;
    const body = commentText.trim();
    setCommentText("");
    setSendingComment(true);
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
      showToast({ type: "error", title: "Could not post comment", message: err.message });
      setCommentText(body);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = () => {
    showDialog({
      title: "Delete Post",
      message: "This cannot be undone.",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id || !user?.id) return;
            setDeleting(true);
            try {
              const { error } = await supabase.from("posts").delete().eq("id", id);
              if (error) throw error;
              qc.invalidateQueries({ queryKey: ["posts"] });
              router.back();
            } catch {
              showToast({ type: "error", title: "Could not delete post" });
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground, marginTop: 10 }]}>
          Post not found
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = post as any;
  const author = p.author;
  const isAuthor = user?.id === p.author_id;
  const mediaUrl = p.image_url || p.imageUrl;
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.trackPill, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.trackPillText, { color: colors.primary }]}>
            {TRACK_LABELS[p.track] || p.track || "General"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isAuthor && (
            <TouchableOpacity onPress={handleDelete} disabled={deleting}>
              <Feather name="trash-2" size={20} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Author */}
        <View style={[styles.authorRow, { marginBottom: 16 }]}>
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
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              @{author?.username || "unknown"} · {timeAgo(p.created_at)}
            </Text>
          </View>
        </View>

        {/* Body */}
        <Text style={[styles.body, { color: colors.foreground, marginBottom: 20 }]}>{p.body}</Text>

        {/* Media */}
        {mediaUrl && (
          <View style={[styles.mediaWrap, { borderColor: colors.border, marginBottom: 20 }]}>
            {isVideo ? (
              Platform.OS === "web" ? (
                <video src={mediaUrl} controls autoPlay muted loop style={styles.webVideo} />
              ) : (
                <Video
                  ref={videoRef}
                  source={{ uri: mediaUrl }}
                  style={styles.mobileVideo}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isMuted
                />
              )
            ) : (
              <Image source={{ uri: mediaUrl }} style={styles.image} resizeMode="cover" />
            )}
          </View>
        )}

        {/* Action Bar */}
        <View style={[styles.actionBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.actionItem}>
            <Feather name="heart" size={18} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontWeight: "600", marginLeft: 4 }}>
              {p.like_count || 0}
            </Text>
          </View>
          <View style={styles.actionItem}>
            <Feather name="message-circle" size={18} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground, fontWeight: "600", marginLeft: 4 }}>
              {comments?.length || 0}
            </Text>
          </View>
        </View>

        {/* Comments */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
            Comments
          </Text>
          {comments?.map((c: any) => (
            <View key={c.id} style={[styles.commentCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.commentHeader}>
                <View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}>
                  {c.author?.avatar_url ? (
                    <Image source={{ uri: c.author.avatar_url }} style={styles.fullImage} />
                  ) : (
                    <Text style={styles.smallAvatarText}>{initials(c.author?.display_name || c.author?.username)}</Text>
                  )}
                </View>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                  {c.author?.display_name || c.author?.username || "Anon"}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, marginLeft: "auto" }}>
                  {timeAgo(c.created_at)}
                </Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 14, marginTop: 4 }}>{c.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, { backgroundColor: colors.primary }]} 
          onPress={handleComment}
          disabled={sendingComment || !commentText.trim()}
        >
          {sendingComment ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  trackPill: { flex: 1, paddingVertical: 6, borderRadius: 12, alignItems: "center" },
  trackPillText: { fontSize: 12, fontWeight: "800" },
  headerActions: { width: 40, alignItems: "center" },
  scroll: { flex: 1 },
  content: { padding: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  authorName: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 24 },
  mediaWrap: { borderRadius: 16, borderWidth: 1, overflow: "hidden", backgroundColor: "#000" },
  image: { width: "100%", height: 300 },
  webVideo: { width: "100%", height: 300 },
  mobileVideo: { width: "100%", height: 300 },
  fullImage: { width: "100%", height: "100%" },
  actionBar: { flexDirection: "row", padding: 12, borderRadius: 16, borderWIdth: 1, gap: 20 },
  actionItem: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  commentCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  smallAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  smallAvatarText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  inputContainer: { flexDirection: "row", padding: 12, borderTopWidth: 1, gap: 10, alignItems: "flex-end" },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, fontWeight: "600" },
});
