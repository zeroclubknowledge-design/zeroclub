import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|avi|m4v|mkv|3gp)(\?.*)?$/i.test(url);
}

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

interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  level: number;
  track: string;
}

interface PostCardProps {
  id: string;
  author: Author;
  body: string;
  imageUrl?: string | null;
  track: string;
  isProofProject: boolean;
  xpAwarded: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  onLike?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
  onPress?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function PostCard({
  id,
  author,
  body,
  imageUrl,
  track,
  isProofProject,
  xpAwarded,
  likeCount,
  commentCount,
  isLiked,
  isBookmarked,
  createdAt,
  onLike,
  onBookmark,
  onComment,
  onPress,
}: PostCardProps) {
  const colors = useColors();

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.();
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBookmark?.();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/user/[id]", params: { id: author.id } } as never)}
          activeOpacity={0.8}
          style={styles.authorPressable}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {author.avatarUrl ? (
              <Image source={{ uri: author.avatarUrl }} style={StyleSheet.absoluteFillObject} borderRadius={20} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {author.displayName[0]?.toUpperCase() ?? "?"}
              </Text>
            )}
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorRow}>
              <Text style={[styles.displayName, { color: colors.foreground }]}>{author.displayName}</Text>
              <View style={[styles.levelBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.levelText, { color: colors.primary }]}>Lv{author.level}</Text>
              </View>
            </View>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>
              @{author.username} · {timeAgo(createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        {isProofProject && (
          <View style={[styles.proofBadge, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={10} color="#fff" />
            <Text style={styles.proofText}>PROOF</Text>
          </View>
        )}
      </View>

      {/* Body — capped at 2 lines, tappable to open full post */}
      <TouchableOpacity
        onPress={() => onPress?.() ?? router.push({ pathname: "/post/[id]", params: { id } } as never)}
        activeOpacity={0.9}
      >
        <Text
          style={[styles.body, { color: colors.foreground }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {body}
        </Text>

        {/* Media — image or video preview */}
        {imageUrl ? (
          isVideoUrl(imageUrl) ? (
            <View style={[styles.videoPreview, { backgroundColor: "#0a0a0a" }]}>
              <View style={styles.videoPlayCircle}>
                <Feather name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
              </View>
              <View style={styles.videoBadge}>
                <Feather name="film" size={10} color="#fff" />
                <Text style={styles.videoBadgeText}>VIDEO</Text>
              </View>
              <Text style={styles.videoHint}>Tap to watch</Text>
            </View>
          ) : (
            <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
          )
        ) : null}
      </TouchableOpacity>

      {/* Track + XP */}
      <View style={styles.metaRow}>
        <View style={[styles.trackChip, { backgroundColor: colors.muted }]}>
          <Text style={[styles.trackText, { color: colors.mutedForeground }]}>
            {TRACK_LABELS[track] ?? track}
          </Text>
        </View>
        <View style={styles.xpRow}>
          <Feather name="zap" size={12} color={colors.xpGold} />
          <Text style={[styles.xpText, { color: colors.xpGold }]}>+{xpAwarded} XP</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
          <Feather name="heart" size={18} color={isLiked ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.actionText, { color: isLiked ? colors.primary : colors.mutedForeground }]}>
            {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={onComment} activeOpacity={0.7}>
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={handleBookmark} activeOpacity={0.7}>
          <Feather
            name="bookmark"
            size={18}
            color={isBookmarked ? colors.primary : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 10,
  },
  authorPressable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "600",
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: "700",
  },
  username: {
    fontSize: 12,
    marginTop: 1,
  },
  proofBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  proofText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  postImage: {
    width: "100%",
    height: 160,
    marginBottom: 8,
  },
  videoPreview: {
    width: "100%",
    height: 160,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    gap: 8,
  },
  videoPlayCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    position: "absolute",
    top: 10,
    right: 10,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  videoHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  trackChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trackText: {
    fontSize: 11,
    fontWeight: "500",
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  xpText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 20,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
