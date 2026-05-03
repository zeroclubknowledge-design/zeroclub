import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGetPostQueryOptions,
  getGetPostQueryKey,
  getListPostsQueryKey,
  getListCommentsQueryOptions,
  getListCommentsQueryKey,
  useLikePost,
  useBookmarkPost,
  useCreateComment,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useDialog } from "@/context/DialogContext";
import * as Haptics from "expo-haptics";
import { Video, ResizeMode } from "expo-av";

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

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    level: number;
  };
}

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [commentText, setCommentText] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const videoRef = useRef<Video>(null);

  const { data: post, isLoading } = useQuery(getGetPostQueryOptions(id ?? ""));
  const { data: comments } = useQuery(getListCommentsQueryOptions(id ?? ""));

  const likePost = useLikePost();
  const bookmarkPost = useBookmarkPost();
  const createComment = useCreateComment();

  const isAuthor = user?.id === (post as any)?.authorId || user?.id === (post as any)?.author?.id;

  const handleLike = () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likePost.mutate(
      { postId: id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetPostQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListPostsQueryKey({}) });
        },
      },
    );
  };

  const handleBookmark = () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkPost.mutate(
      { postId: id },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetPostQueryKey(id) }),
      },
    );
  };

  const handleComment = () => {
    if (!commentText.trim() || !id) return;
    const body = commentText.trim();
    setCommentText("");
    createComment.mutate(
      { postId: id, data: { body } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCommentsQueryKey(id) });
          qc.invalidateQueries({ queryKey: getGetPostQueryKey(id) });
        },
        onError: () => {
          showToast({ type: "error", title: "Could not post comment" });
          setCommentText(body);
        },
      },
    );
  };

  const handleEdit = async () => {
    if (!editBody.trim() || !id || !token) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    try {
      const res = await fetch(`${baseUrl}/api/posts/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: editBody.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditModal(false);
      qc.invalidateQueries({ queryKey: getGetPostQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListPostsQueryKey({}) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      showToast({ type: "error", title: "Could not update post" });
    }
  };

  const handleDelete = () => {
    showDialog({
      title: "Delete Post",
      message: "This will remove the post and the XP awarded for it. This cannot be undone.",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id || !token) return;
            setDeleting(true);
            const domain = process.env["EXPO_PUBLIC_DOMAIN"];
            const baseUrl = domain ? `https://${domain}` : "";
            try {
              const res = await fetch(`${baseUrl}/api/posts/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) throw new Error("Failed");
              qc.invalidateQueries({ queryKey: getListPostsQueryKey({}) });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = post as any;
  const author = p.author;
  const mediaUrl = p.imageUrl as string | null | undefined;
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.trackPill, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.trackPillText, { color: colors.primary }]}>
            {TRACK_LABELS[p.track] ?? p.track}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isAuthor && (
            <>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: colors.muted }]}
                onPress={() => {
                  setEditBody(p.body);
                  setEditModal(true);
                }}
              >
                <Feather name="edit-2" size={15} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: colors.muted }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Feather name="trash-2" size={15} color={colors.destructive} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Author card */}
        <View style={[styles.authorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.authorRow}
            onPress={() =>
              router.push({ pathname: "/user/[id]", params: { id: author.id } } as never)
            }
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {author.avatarUrl ? (
                <Image
                  source={{ uri: author.avatarUrl }}
                  style={StyleSheet.absoluteFillObject}
                  borderRadius={24}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {author.displayName[0]?.toUpperCase() ?? "?"}
                </Text>
              )}
            </View>
            <View style={styles.authorMeta}>
              <View style={styles.authorNameRow}>
                <Text style={[styles.authorName, { color: colors.foreground }]}>
                  {author.displayName}
                </Text>
                <View style={[styles.levelBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Feather name="zap" size={9} color={colors.primary} />
                  <Text style={[styles.levelText, { color: colors.primary }]}>Lv{author.level}</Text>
                </View>
                {p.isProofProject && (
                  <View style={[styles.proofBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.proofText}>PROOF</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.authorSub, { color: colors.mutedForeground }]}>
                @{author.username} · {timeAgo(p.createdAt)}
              </Text>
            </View>
            <View style={[styles.xpEarned, { backgroundColor: colors.xpGold + "18" }]}>
              <Feather name="zap" size={11} color={colors.xpGold} />
              <Text style={[styles.xpEarnedText, { color: colors.xpGold }]}>+{p.xpAwarded}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Post body */}
        <Text style={[styles.body, { color: colors.foreground }]}>{p.body}</Text>

        {/* Media */}
        {mediaUrl && (
          <View style={[styles.mediaWrap, { backgroundColor: "#000", borderColor: colors.border }]}>
            {isVideo ? (
              Platform.OS === "web" ? (
                <View style={styles.webVideoWrap}>
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore — web-only video element */}
                  <video
                    src={mediaUrl}
                    controls
                    playsInline
                    style={{ width: "100%", height: 280, objectFit: "contain", backgroundColor: "#000" }}
                  />
                </View>
              ) : (
                <Video
                  ref={videoRef}
                  source={{ uri: mediaUrl }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping={false}
                />
              )
            ) : (
              <Image
                source={{ uri: mediaUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            )}
          </View>
        )}

        {/* Action bar */}
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
            <Feather
              name="heart"
              size={20}
              color={p.isLiked ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.actionCount, { color: p.isLiked ? colors.primary : colors.mutedForeground }]}>
              {p.likeCount}
            </Text>
            <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>likes</Text>
          </TouchableOpacity>

          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

          <View style={styles.actionBtn}>
            <Feather name="message-circle" size={20} color={colors.mutedForeground} />
            <Text style={[styles.actionCount, { color: colors.foreground }]}>{p.commentCount}</Text>
            <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>comments</Text>
          </View>

          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark} activeOpacity={0.7}>
            <Feather
              name="bookmark"
              size={20}
              color={p.isBookmarked ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.actionLabel, { color: p.isBookmarked ? colors.primary : colors.mutedForeground }]}>
              {p.isBookmarked ? "saved" : "save"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <Text style={[styles.commentsSectionTitle, { color: colors.foreground }]}>
            Comments{comments?.length ? ` (${comments.length})` : ""}
          </Text>

          {(comments ?? []).length === 0 && (
            <View style={[styles.emptyComments, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="message-circle" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyCommentsText, { color: colors.mutedForeground }]}>
                No comments yet. Be the first!
              </Text>
            </View>
          )}

          {(comments as Comment[] ?? []).map((comment) => (
            <View
              key={comment.id}
              style={[styles.commentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/user/[id]", params: { id: comment.author.id } } as never)
                }
                activeOpacity={0.8}
              >
                <View style={[styles.commentAvatar, { backgroundColor: colors.primary }]}>
                  {comment.author.avatarUrl ? (
                    <Image
                      source={{ uri: comment.author.avatarUrl }}
                      style={StyleSheet.absoluteFillObject}
                      borderRadius={16}
                    />
                  ) : (
                    <Text style={styles.commentAvatarText}>
                      {comment.author.displayName[0]?.toUpperCase() ?? "?"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentName, { color: colors.foreground }]}>
                    {comment.author.displayName}
                  </Text>
                  <View style={[styles.commentLevelBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.commentLevelText, { color: colors.primary }]}>
                      Lv{comment.author.level}
                    </Text>
                  </View>
                  <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                    {timeAgo(comment.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.commentBody, { color: colors.foreground }]}>{comment.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        <View style={[styles.commentAvatar, { backgroundColor: colors.primary }]}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={StyleSheet.absoluteFillObject}
              borderRadius={16}
            />
          ) : (
            <Text style={styles.commentAvatarText}>
              {(user?.displayName ?? "U")[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <TextInput
          style={[
            styles.commentInput,
            { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
          ]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={handleComment}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: commentText.trim() ? colors.primary : colors.muted },
          ]}
          onPress={handleComment}
          disabled={!commentText.trim() || createComment.isPending}
        >
          {createComment.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={14} color={commentText.trim() ? "#fff" : colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: colors.card }]}>
            <View style={styles.editHandle} />
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.foreground }]}>Edit Post</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.editInput,
                { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
              ]}
              value={editBody}
              onChangeText={setEditBody}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoFocus
              placeholder="What are you building?"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.editCharCount, { color: colors.mutedForeground }]}>
              {editBody.length}/500
            </Text>
            <TouchableOpacity
              style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
              onPress={handleEdit}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.editSaveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  backLink: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  trackPill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "center",
  },
  trackPillText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  authorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  authorMeta: { flex: 1, gap: 3 },
  authorNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  authorName: { fontSize: 16, fontWeight: "700" },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontSize: 10, fontWeight: "700" },
  proofBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  proofText: { color: "#fff", fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  authorSub: { fontSize: 12 },
  xpEarned: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  xpEarnedText: { fontSize: 12, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 26, fontFamily: "Inter_400Regular" },
  mediaWrap: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  video: { width: "100%", height: 280, backgroundColor: "#000" },
  webVideoWrap: { width: "100%", backgroundColor: "#000" },
  image: { width: "100%", height: 280 },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actionCount: { fontSize: 15, fontWeight: "700" },
  actionLabel: { fontSize: 12 },
  actionDivider: { width: 1, height: 20 },
  commentsSection: { gap: 10 },
  commentsSectionTitle: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  emptyComments: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  emptyCommentsText: { fontSize: 13 },
  commentRow: { flexDirection: "row", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, alignSelf: "flex-start" },
  commentAvatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  commentContent: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  commentName: { fontSize: 13, fontWeight: "700" },
  commentLevelBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  commentLevelText: { fontSize: 9, fontWeight: "700" },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentInput: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 },
  modalOverlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  editHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#555", alignSelf: "center", marginBottom: 20 },
  editHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  editTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  editInput: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 15, lineHeight: 22, minHeight: 140, marginBottom: 6 },
  editCharCount: { fontSize: 11, textAlign: "right", marginBottom: 14 },
  editSaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  editSaveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
