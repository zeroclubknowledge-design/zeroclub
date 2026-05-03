import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const TIERS = [
  {
    min: 1,
    max: 4,
    multiplier: "1x",
    label: "Base",
    description: "Your post is live and earning base XP.",
    color: "#6B7280",
    icon: "check-circle" as const,
  },
  {
    min: 5,
    max: 9,
    multiplier: "1.5x",
    label: "Validated",
    description: "5 people tested your product. Nice traction!",
    color: "#10B981",
    icon: "check-circle" as const,
  },
  {
    min: 10,
    max: 24,
    multiplier: "2x",
    label: "Proven",
    description: "10+ testers means real product validation.",
    color: "#3B82F6",
    icon: "shield" as const,
  },
  {
    min: 25,
    max: 49,
    multiplier: "3x",
    label: "Hot",
    description: "25+ testers. Your build is generating buzz.",
    color: "#F59E0B",
    icon: "zap" as const,
  },
  {
    min: 50,
    max: null,
    multiplier: "5x",
    label: "Viral",
    description: "50+ testers. You've gone viral in Zero Club.",
    color: "#D4387C",
    icon: "award" as const,
  },
];

export default function ZeroProofScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Zero Proof</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: "#D4387C22" }]}>
            <Feather name="check-circle" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>What is Zero Proof?</Text>
          <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>
            Zero Proof is how the community validates your builds. When someone taps the{" "}
            <Text style={{ color: "#10B981", fontWeight: "700" }}>✓ Proof</Text> button on your post,
            it means they actually tested your product — especially if you shared a link.
          </Text>
          <Text style={[styles.heroBody, { color: colors.mutedForeground, marginTop: 8 }]}>
            More proof clicks = higher multiplier = more XP boost per post. Every unique proof also
            awards you <Text style={{ color: colors.xpGold, fontWeight: "700" }}>+5 XP</Text> directly.
          </Text>
        </View>

        {/* How it works */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>HOW IT WORKS</Text>
        <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "share-2" as const, label: "Post your build", sub: "Share a project with a link to your product or prototype." },
            { icon: "check-circle" as const, label: "Others test it", sub: "Community members tap Proof after trying your product." },
            { icon: "zap" as const, label: "Earn XP + multiplier", sub: "Each unique proof click gives you +5 XP and lifts your multiplier tier." },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepIconWrap, { backgroundColor: colors.muted }]}>
                <Feather name={step.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.stepText}>
                <Text style={[styles.stepLabel, { color: colors.foreground }]}>{step.label}</Text>
                <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Multiplier tiers */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MULTIPLIER TIERS</Text>
        <View style={[styles.tiersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TIERS.map((tier, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.tierSep, { backgroundColor: colors.border }]} />}
              <View style={styles.tierRow}>
                <View style={[styles.tierIconWrap, { backgroundColor: tier.color + "22" }]}>
                  <Feather name={tier.icon} size={18} color={tier.color} />
                </View>
                <View style={styles.tierInfo}>
                  <View style={styles.tierTopRow}>
                    <Text style={[styles.tierLabel, { color: colors.foreground }]}>{tier.label}</Text>
                    <View style={[styles.tierRange, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.tierRangeText, { color: colors.mutedForeground }]}>
                        {tier.max ? `${tier.min}–${tier.max} proofs` : `${tier.min}+ proofs`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tierDesc, { color: colors.mutedForeground }]}>{tier.description}</Text>
                </View>
                <Text style={[styles.multiplier, { color: tier.color }]}>{tier.multiplier}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Note */}
        <View style={[styles.noteCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            You cannot proof your own posts. The multiplier badge appears on your post once you reach 5 proofs.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  content: { padding: 16, gap: 12 },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  heroBody: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
    marginLeft: 4,
  },
  stepsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 16 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  stepIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1, gap: 2 },
  stepLabel: { fontSize: 14, fontWeight: "600" },
  stepSub: { fontSize: 13, lineHeight: 18 },
  tiersCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tierRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  tierSep: { height: 1 },
  tierIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tierInfo: { flex: 1, gap: 3 },
  tierTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierLabel: { fontSize: 14, fontWeight: "600" },
  tierRange: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tierRangeText: { fontSize: 11, fontWeight: "500" },
  tierDesc: { fontSize: 12, lineHeight: 17 },
  multiplier: { fontSize: 18, fontWeight: "800" },
  noteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
