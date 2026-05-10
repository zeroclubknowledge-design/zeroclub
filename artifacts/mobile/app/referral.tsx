import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface ReferralStats {
  referralCode: string | null;
  referredCount: number;
  totalXpEarned: number;
  sameSchoolCount: number;
  crossSchoolCount: number;
}

export default function ReferralScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const { showToast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const domain = process.env["EXPO_PUBLIC_DOMAIN"] || "zeroclubapp.com";
  const referralCode = stats?.referralCode || user?.referralCode;
  const referralLink = referralCode && referralCode !== "—"
    ? `https://${domain}/register?ref=${referralCode}`
    : `https://${domain}/register`;

  useEffect(() => {
    if (!token) return;
    const domainStr = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domainStr ? `https://${domainStr}` : "";
    fetch(`${baseUrl}/api/referrals/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setStats(data as ReferralStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Zero Club — the community for students building real skills. Use my code ${referralCode} and get 500 XP free! 🚀\n\n${referralLink}`,
        url: referralLink,
      });
    } catch {}
  };

  const handleCopy = async () => {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(referralLink);
        showToast({ type: "success", title: "Link copied!", message: "Referral link copied to clipboard" });
      } catch {}
    } else {
      // In mobile, we could use a clipboard helper, but for now we'll just show toast
      showToast({ type: "success", title: "Link copied!", message: referralLink });
    }
  };

  const howItWorks = [
    { icon: "send", title: "Share Link", desc: "Send your unique link to friends and classmates." },
    { icon: "user-plus", title: "They Join", desc: "Friends sign up using your link to join the club." },
    { icon: "zap", title: "Earn XP", desc: "Get 500 XP for every successful referral." },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Refer & Earn</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={[colors.primary, "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroIconWrap}>
              <Feather name="gift" size={32} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Invite Friends, Get Points</Text>
            <Text style={styles.heroSub}>
              Africa's best builder community is better with friends.
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{loading ? "—" : stats?.referredCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Referrals</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.xpGold }]}>{loading ? "—" : (stats?.totalXpEarned ?? 0).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>XP Earned</Text>
          </View>
        </View>

        {/* Referral Link Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR REFERRAL LINK</Text>
          <View style={[styles.linkContainer, { backgroundColor: colors.muted }]}>
            <Text style={[styles.linkText, { color: colors.foreground }]} numberOfLines={1}>
              {referralLink}
            </Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyIcon}>
              <Feather name="copy" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.codeRow}>
            <View>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>YOUR CODE</Text>
              <Text style={[styles.codeText, { color: colors.foreground }]}>{referralCode}</Text>
            </View>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="share-2" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.guideContainer}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How it works</Text>
          {howItWorks.map((item, i) => (
            <View key={i} style={styles.guideRow}>
              <View style={[styles.guideIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={item.icon as any} size={16} color={colors.primary} />
              </View>
              <View style={styles.guideContent}>
                <Text style={[styles.guideTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.guideDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reward Rate */}
        <View style={[styles.rewardSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>REWARD RATE</Text>
          <View style={styles.rewardItem}>
            <Text style={[styles.rewardVal, { color: colors.xpGold }]}>+500 XP</Text>
            <Text style={[styles.rewardSub, { color: colors.mutedForeground }]}>Per Successful Referral</Text>
          </View>
        </View>

        {loading && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        )}
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
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 16 },
  hero: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 24,
    minHeight: 180,
    justifyContent: "center",
  },
  heroOverlay: { alignItems: "center", gap: 12 },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center", fontFamily: "Inter_700Bold" },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontWeight: "500" },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 16 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 12,
  },
  linkText: { flex: 1, fontSize: 14, fontWeight: "500" },
  copyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.03)" },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  miniLabel: { fontSize: 9, fontWeight: "700", marginBottom: 2 },
  codeText: { fontSize: 22, fontWeight: "900", letterSpacing: 1, fontFamily: "Inter_700Bold" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  shareBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  guideContainer: { paddingHorizontal: 4, gap: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  guideRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  guideIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideContent: { flex: 1, gap: 2 },
  guideTitle: { fontSize: 15, fontWeight: "700" },
  guideDesc: { fontSize: 13, lineHeight: 18 },
  rewardSection: { padding: 16, borderRadius: 20, borderWidth: 1, gap: 12 },
  rewardGrid: { flexDirection: "row", alignItems: "center" },
  rewardItem: { flex: 1, alignItems: "center", gap: 2 },
  rewardVal: { fontSize: 18, fontWeight: "800" },
  rewardSub: { fontSize: 12 },
  rewardSep: { width: 1, height: 32 },
});
