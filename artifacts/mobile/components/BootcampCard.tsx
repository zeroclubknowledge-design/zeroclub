import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const TRACK_LABELS: Record<string, string> = {
  product_design: "Product Design",
  frontend: "Frontend",
  growth: "Growth",
  branding: "Branding",
  mentorship: "Mentorship",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

interface BootcampCardProps {
  id: string;
  title: string;
  subtitle: string;
  track: string;
  difficulty: string;
  modulesCount: number;
  xpReward: number;
  enrolled: boolean;
  progress?: number;
  onPress?: () => void;
  onEnroll?: () => void;
}

export function BootcampCard({
  title,
  subtitle,
  track,
  difficulty,
  modulesCount,
  xpReward,
  enrolled,
  progress = 0,
  onPress,
  onEnroll,
}: BootcampCardProps) {
  const colors = useColors();
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? colors.mutedForeground;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top accent bar */}
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
        </View>

        {/* Title */}
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
        </View>

        {/* Progress bar if enrolled */}
        {enrolled && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${progress}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {progress}% complete
            </Text>
          </View>
        )}

        {/* Enroll button */}
        {!enrolled && (
          <TouchableOpacity
            style={[styles.enrollBtn, { backgroundColor: colors.primary }]}
            onPress={onEnroll}
            activeOpacity={0.8}
          >
            <Text style={styles.enrollText}>Enroll Now</Text>
          </TouchableOpacity>
        )}
        {enrolled && (
          <View style={[styles.enrolledBadge, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.enrolledText, { color: colors.success }]}>Enrolled</Text>
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
  accentBar: {
    height: 3,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 2,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressSection: {
    gap: 4,
    marginTop: 4,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
  },
  enrollBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  enrollText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  enrolledText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
