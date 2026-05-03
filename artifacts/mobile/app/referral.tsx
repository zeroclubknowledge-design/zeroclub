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
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useDialog } from "@/context/DialogContext";

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
  const { token } = useAuth();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    fetch(`${baseUrl}/api/referrals/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setStats(data as ReferralStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleShare = async () => {
    if (!stats?.referralCode) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const link = `https://${domain ?? "zeroclubapp.com"}/register?ref=${stats.referralCode}`;
    try {
      await Share.share({
        message: `Join me on Zero Club — the community for students building real skills. Use my code ${stats.referralCode} and get 50 XP free! 🚀\n\n${link}`,
        url: link,
      });
    } catch {}
  };

  const handleCopy = async () => {
    if (!stats?.referralCode) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const link = `https://${domain ?? "zeroclubapp.com"}/register?ref=${stats.referralCode}`;
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(link);
        showToast({ type: "success", title: "Link copied!", message: "Referral link copied to clipboard" });
      } catch {}
    } else {
      showDialog({ title: "Your Referral Link", message: link, buttons: [{ text: "Got it" }] });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Refer & Earn</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Feather name="users" size={28} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Invite & Earn Zero Points</Text>
          <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>
            Invite other students to Zero Club. Earn XP when they join using your link.
          </Text>
        </View>

        {/* Reward rates */}
        <View style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>REWARD RATES</Text>
          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardXp, { color: colors.xpGold }]}>+250 XP</Text>
              <Text style={[styles.rewardDesc, { color: colors.mutedForeground }]}>Same institution</Text>
            </View>
            <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardXp, { color: colors.xpGold }]}>+400 XP</Text>
              <Text style={[styles.rewardDesc, { color: colors.mutedForeground }]}>Cross-institution</Text>
            </View>
            <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardXp, { color: colors.primary }]}>+50 XP</Text>
              <Text style={[styles.rewardDesc, { color: colors.mutedForeground }]}>They receive</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
        ) : stats ? (
          <>
            {/* Code box */}
            <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.codeSmallLabel, { color: colors.mutedForeground }]}>
                  YOUR REFERRAL CODE
                </Text>
                <Text style={[styles.codeText, { color: colors.foreground }]}>
                  {stats.referralCode ?? "—"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCopy}
                style={[styles.copyBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="copy" size={14} color="#fff" />
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleShare}
              style={[styles.shareBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}
            >
              <Feather name="share-2" size={16} color={colors.primary} />
              <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share Referral Link</Text>
            </TouchableOpacity>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.referredCount}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Referred</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.sameSchoolCount}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Same School</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.xpGold }]}>
                  {stats.totalXpEarned.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>XP Earned</Text>
              </View>
            </View>
          </>
        ) : null}
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
  content: { padding: 20, gap: 14 },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", fontFamily: "Inter_700Bold" },
  heroBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  rewardCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  rewardRow: { flexDirection: "row", alignItems: "center" },
  rewardItem: { flex: 1, alignItems: "center", gap: 3 },
  rewardDivider: { width: 1, height: 36 },
  rewardXp: { fontSize: 16, fontWeight: "800" },
  rewardDesc: { fontSize: 11, textAlign: "center" },
  codeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  codeSmallLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  codeText: { fontSize: 24, fontWeight: "800", letterSpacing: 3, fontFamily: "Inter_700Bold" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 15, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 3 },
  statValue: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, textAlign: "center" },
});
