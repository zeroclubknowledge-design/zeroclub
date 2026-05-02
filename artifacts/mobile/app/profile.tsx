import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const TRACK_LABELS: Record<string, string> = {
  product_design: "Product Design",
  frontend: "Frontend",
  growth: "Growth",
  branding: "Branding",
  mentorship: "Mentorship",
};

interface ReferralStats {
  referralCode: string | null;
  referredCount: number;
  totalXpEarned: number;
  sameSchoolCount: number;
  crossSchoolCount: number;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (!token) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    fetch(`${baseUrl}/api/referrals/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setReferralStats(data as ReferralStats))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [token]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleShareReferral = async () => {
    if (!referralStats?.referralCode) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "https://zeroclubapp.com";
    const link = `${baseUrl}/register?ref=${referralStats.referralCode}`;
    try {
      await Share.share({
        message: `Join me on Zero Club — the private community for SS students building real skills. Use my referral code ${referralStats.referralCode} and get 50 XP free! 🚀\n\n${link}`,
        url: link,
      });
    } catch {}
  };

  const handleCopyCode = async () => {
    if (!referralStats?.referralCode) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "https://zeroclubapp.com";
    const link = `${baseUrl}/register?ref=${referralStats.referralCode}`;
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(link);
        Alert.alert("Copied!", "Referral link copied to clipboard");
      } catch {}
    } else {
      Alert.alert("Your Referral Link", link);
    }
  };

  const initials = (user?.displayName ?? "U").slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.heroSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {user?.displayName}
          </Text>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            @{user?.username}
          </Text>
          {user?.school && (
            <View style={[styles.schoolBadge, { backgroundColor: colors.muted }]}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.schoolText, { color: colors.mutedForeground }]}>
                {user.school}
              </Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.levelText}>{user?.level ?? 1}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Level</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.xpGold }]}>
              {(user?.xpBalance ?? 0).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>XP</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.trackPill, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.trackText, { color: colors.primary }]}>
                {TRACK_LABELS[user?.track ?? "frontend"]?.split(" ")[0] ?? "—"}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Track</Text>
          </View>
        </View>

        {/* Referral Section */}
        <View style={styles.sectionHeader}>
          <Feather name="users" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Refer & Earn XP</Text>
        </View>

        <View style={[styles.referralCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.referralIntro, { color: colors.mutedForeground }]}>
            Invite your classmates and students from other schools. Earn XP every time someone joins with your code.
          </Text>

          <View style={[styles.rewardRow, { backgroundColor: colors.muted, borderRadius: 12 }]}>
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardXp, { color: colors.xpGold }]}>+250 XP</Text>
              <Text style={[styles.rewardLabel, { color: colors.mutedForeground }]}>Same school</Text>
            </View>
            <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardXp, { color: colors.xpGold }]}>+400 XP</Text>
              <Text style={[styles.rewardLabel, { color: colors.mutedForeground }]}>Cross-school</Text>
            </View>
            <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardXp, { color: colors.primary }]}>+50 XP</Text>
              <Text style={[styles.rewardLabel, { color: colors.mutedForeground }]}>They get</Text>
            </View>
          </View>

          {loadingStats ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : referralStats ? (
            <>
              <View style={[styles.codeBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={styles.codeLeft}>
                  <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
                    YOUR REFERRAL CODE
                  </Text>
                  <Text style={[styles.codeText, { color: colors.foreground }]}>
                    {referralStats.referralCode ?? "—"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopyCode}
                  style={[styles.copyBtn, { backgroundColor: colors.primary }]}
                >
                  <Feather name="copy" size={14} color="#fff" />
                  <Text style={styles.copyText}>Copy Link</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleShareReferral}
                style={[styles.shareBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}
              >
                <Feather name="share-2" size={16} color={colors.primary} />
                <Text style={[styles.shareBtnText, { color: colors.primary }]}>
                  Share Referral Link
                </Text>
              </TouchableOpacity>

              <View style={styles.referralStats}>
                <View style={[styles.referralStatBox, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.referralStatValue, { color: colors.foreground }]}>
                    {referralStats.referredCount}
                  </Text>
                  <Text style={[styles.referralStatLabel, { color: colors.mutedForeground }]}>
                    Total Referred
                  </Text>
                </View>
                <View style={[styles.referralStatBox, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.referralStatValue, { color: colors.foreground }]}>
                    {referralStats.sameSchoolCount}
                  </Text>
                  <Text style={[styles.referralStatLabel, { color: colors.mutedForeground }]}>
                    Same School
                  </Text>
                </View>
                <View style={[styles.referralStatBox, { backgroundColor: colors.muted }]}>
                  <Feather name="zap" size={12} color={colors.xpGold} style={{ alignSelf: "center" }} />
                  <Text style={[styles.referralStatValue, { color: colors.xpGold }]}>
                    {referralStats.totalXpEarned.toLocaleString()}
                  </Text>
                  <Text style={[styles.referralStatLabel, { color: colors.mutedForeground }]}>
                    XP Earned
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Account info */}
        <View style={styles.sectionHeader}>
          <Feather name="user" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="mail" label="Email" value={user?.email ?? "—"} colors={colors} />
          <View style={[styles.infoSep, { backgroundColor: colors.border }]} />
          <InfoRow icon="at-sign" label="Username" value={`@${user?.username ?? "—"}`} colors={colors} />
          {user?.school && (
            <>
              <View style={[styles.infoSep, { backgroundColor: colors.border }]} />
              <InfoRow icon="map-pin" label="School" value={user.school} colors={colors} />
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutFullBtn, { backgroundColor: colors.card, borderColor: "#ef4444" + "40" }]}
        >
          <Feather name="log-out" size={16} color="#ef4444" />
          <Text style={[styles.logoutFullText, { color: "#ef4444" }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={15} color={colors.mutedForeground} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
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
  logoutBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 16 },
  heroSection: { alignItems: "center", gap: 6, paddingBottom: 4 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  displayName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  username: { fontSize: 14, fontWeight: "500" },
  schoolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 2,
  },
  schoolText: { fontSize: 12, fontWeight: "500" },
  statsCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 36, marginHorizontal: 4 },
  levelBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  trackPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  trackText: { fontSize: 12, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  referralCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  referralIntro: { fontSize: 13, lineHeight: 19 },
  rewardRow: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  rewardItem: { flex: 1, alignItems: "center", gap: 2 },
  rewardDivider: { width: 1, height: 30, marginHorizontal: 4 },
  rewardXp: { fontSize: 14, fontWeight: "800" },
  rewardLabel: { fontSize: 10, fontWeight: "500", textAlign: "center" },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  codeLeft: { flex: 1 },
  codeLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  codeText: { fontSize: 20, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 14, fontWeight: "700" },
  referralStats: { flexDirection: "row", gap: 8 },
  referralStatBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  referralStatValue: { fontSize: 18, fontWeight: "800" },
  referralStatLabel: { fontSize: 10, textAlign: "center", fontWeight: "500" },
  infoCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue: { fontSize: 14, fontWeight: "500", marginTop: 1 },
  infoSep: { height: 1, marginHorizontal: 16 },
  logoutFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutFullText: { fontSize: 15, fontWeight: "700" },
});
