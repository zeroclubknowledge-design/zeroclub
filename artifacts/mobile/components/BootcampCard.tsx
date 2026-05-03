import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

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

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

const DELIVERY_ICONS: Record<string, string> = {
  video: "play-circle",
  live: "radio",
  text: "book-open",
  hybrid: "layers",
};

const DELIVERY_LABELS: Record<string, string> = {
  video: "Video",
  live: "Live",
  text: "Text",
  hybrid: "Hybrid",
};

interface BootcampCardProps {
  id: string;
  title: string;
  subtitle: string;
  track: string;
  difficulty: string;
  deliveryMedium?: string;
  coverUrl?: string | null;
  modulesCount: number;
  xpReward: number;
  priceCents?: number;
  enrolled: boolean;
  progress?: number;
  onPress?: () => void;
  onEnroll?: () => void;
}

function formatPrice(priceCents: number): string {
  if (priceCents === 0) return "Free";
  return `₦${(priceCents / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export function BootcampCard({
  title,
  subtitle,
  track,
  difficulty,
  deliveryMedium,
  coverUrl,
  modulesCount,
  xpReward,
  priceCents = 0,
  enrolled,
  progress = 0,
  onPress,
  onEnroll,
}: BootcampCardProps) {
  const colors = useColors();
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? colors.mutedForeground;
  const isPaid = priceCents > 0;
  const deliveryIcon = (DELIVERY_ICONS[deliveryMedium ?? ""] ?? "play-circle") as "play-circle" | "radio" | "book-open" | "layers";
  const deliveryLabel = DELIVERY_LABELS[deliveryMedium ?? ""] ?? "Video";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Cover Image */}
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="cover" />
      ) : (
        <View style={[styles.coverPlaceholder, { backgroundColor: colors.muted }]}>
          <Feather name="book" size={32} color={colors.mutedForeground} />
        </View>
      )}

      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

      <View style={styles.content}>
        {/* Tags row */}
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: colors.muted }]}>
            <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
              {TRACK_LABELS[track] ?? track}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: diffColor + "22" }]}>
            <Text style={[styles.tagText, { color: diffColor }]}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.primary + "22" }]}>
            <Feather name={deliveryIcon} size={10} color={colors.primary} />
            <Text style={[styles.tagText, { color: colors.primary }]}>{deliveryLabel}</Text>
          </View>
          {isPaid ? (
            <View style={[styles.tag, { backgroundColor: "#F59E0B22" }]}>
              <Feather name="star" size={10} color="#F59E0B" />
              <Text style={[styles.tagText, { color: "#F59E0B" }]}>Premium</Text>
            </View>
          ) : (
            <View style={[styles.tag, { backgroundColor: "#10B98122" }]}>
              <Text style={[styles.tagText, { color: "#10B981" }]}>Free</Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
          {subtitle}
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="layers" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {modulesCount} modules
            </Text>
          </View>
          <View style={styles.stat}>
            <Feather name="zap" size={13} color={colors.xpGold} />
            <Text style={[styles.statText, { color: colors.xpGold }]}>+{xpReward} XP</Text>
          </View>
          {isPaid && (
            <View style={styles.stat}>
              <Feather name="tag" size={13} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {formatPrice(priceCents)}
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        {enrolled && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
              <View
                style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` as `${number}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {progress}% complete
            </Text>
          </View>
        )}

        {/* CTA */}
        {!enrolled ? (
          <TouchableOpacity
            style={[styles.enrollBtn, { backgroundColor: colors.primary }]}
            onPress={onEnroll ?? onPress}
            activeOpacity={0.8}
          >
            {isPaid ? (
              <>
                <Feather name="credit-card" size={13} color="#fff" />
                <Text style={styles.enrollText}>Enroll · {formatPrice(priceCents)}</Text>
              </>
            ) : (
              <Text style={styles.enrollText}>Enroll for Free</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.enrolledBadge, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.enrolledText, { color: colors.success }]}>
              {progress === 100 ? "Completed" : "In Progress"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  coverImage: {
    width: "100%",
    height: 160,
  },
  coverPlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  accentBar: { height: 3 },
  content: { padding: 16, gap: 8 },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  tagText: { fontSize: 11, fontWeight: "500" },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  statsRow: { flexDirection: "row", gap: 14, marginTop: 2, flexWrap: "wrap" },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontWeight: "500" },
  progressSection: { gap: 4, marginTop: 4 },
  progressBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 11 },
  enrollBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  enrollText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  enrolledText: { fontSize: 13, fontWeight: "600" },
});
