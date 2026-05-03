import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { storePendingShare } from "@/hooks/useShare";

const LOGO = require("../../../assets/images/icon.png");

interface BootcampPreview {
  id: string;
  title: string;
  subtitle: string;
  coverUrl?: string | null;
  priceCents: number;
  track: string;
  difficulty: string;
  xpReward: number;
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

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

export default function ShareBootcampScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, ref } = useLocalSearchParams<{ id: string; ref?: string }>();
  const { token } = useAuth();
  const [bootcamp, setBootcamp] = useState<BootcampPreview | null>(null);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  useEffect(() => {
    if (!id) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const base = domain ? `https://${domain}` : "";
    fetch(`${base}/api/bootcamps/${id}/preview`)
      .then((r) => r.json())
      .then((d: BootcampPreview) => setBootcamp(d))
      .catch(() => setBootcamp(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    await storePendingShare(ref ?? null, { type: "bootcamp", id });
    router.push("/register");
  };

  const handleSignIn = async () => {
    await storePendingShare(ref ?? null, { type: "bootcamp", id });
    router.push("/login");
  };

  const handleOpen = () => {
    router.replace("/(tabs)/bootcamps" as never);
  };

  const coverUri = bootcamp?.coverUrl?.startsWith("/")
    ? `${process.env["EXPO_PUBLIC_DOMAIN"] ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}` : ""}${bootcamp.coverUrl}`
    : bootcamp?.coverUrl ?? undefined;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>
      {/* Brand header */}
      <View style={styles.brand}>
        <Image source={LOGO} style={styles.logo} />
        <Text style={[styles.brandName, { color: colors.foreground }]}>Zero Club</Text>
        <Text style={[styles.brandTag, { color: colors.mutedForeground }]}>A private club for builders.</Text>
      </View>

      {/* Invite chip */}
      <View style={[styles.inviteChip, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
        <Feather name="user-plus" size={13} color={colors.primary} />
        <Text style={[styles.inviteText, { color: colors.primary }]}>
          You've been invited to a bootcamp
        </Text>
      </View>

      {/* Bootcamp card */}
      {loading ? (
        <View style={[styles.cardShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : bootcamp ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.muted }]}>
              <Feather name="book-open" size={40} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.cardMeta}>
              <View style={[styles.trackBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.trackText, { color: colors.mutedForeground }]}>
                  {TRACK_LABELS[bootcamp.track] ?? bootcamp.track}
                </Text>
              </View>
              <View style={[styles.diffBadge, { backgroundColor: (DIFFICULTY_COLORS[bootcamp.difficulty] ?? "#888") + "22" }]}>
                <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[bootcamp.difficulty] ?? "#888" }]}>
                  {bootcamp.difficulty}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{bootcamp.title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
              {bootcamp.subtitle}
            </Text>
            <View style={styles.cardFooter}>
              <View style={styles.xpRow}>
                <Feather name="zap" size={13} color="#F59E0B" />
                <Text style={[styles.xpText, { color: "#F59E0B" }]}>+{bootcamp.xpReward} XP on completion</Text>
              </View>
              <Text style={[styles.price, { color: bootcamp.priceCents === 0 ? "#10B981" : colors.foreground }]}>
                {bootcamp.priceCents === 0 ? "Free" : `$${(bootcamp.priceCents / 100).toFixed(2)}`}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.cardShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="book-open" size={32} color={colors.mutedForeground} />
          <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Bootcamp unavailable</Text>
        </View>
      )}

      {/* Perks */}
      <View style={styles.perks}>
        {[
          { icon: "award" as const, text: "Earn XP and level up as you learn" },
          { icon: "users" as const, text: "Connect with Africa's best builders" },
          { icon: "zap" as const, text: "Get proof-of-work on every project" },
        ].map((p) => (
          <View key={p.text} style={styles.perkRow}>
            <View style={[styles.perkIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name={p.icon} size={15} color={colors.primary} />
            </View>
            <Text style={[styles.perkText, { color: colors.mutedForeground }]}>{p.text}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      {token ? (
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleOpen} activeOpacity={0.85}>
          <Feather name="book-open" size={18} color="#fff" />
          <Text style={styles.btnText}>Browse Bootcamps</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.ctaGroup}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleJoin} activeOpacity={0.85}>
            <Feather name="user-plus" size={18} color="#fff" />
            <Text style={styles.btnText}>Join Zero Club — It's Free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.border }]} onPress={handleSignIn} activeOpacity={0.8}>
            <Text style={[styles.btnOutlineText, { color: colors.foreground }]}>Already a member? Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.fine, { color: colors.mutedForeground }]}>
        {ref ? `Invited via referral code ${ref}` : "Zero Club · A private club for builders"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 20, alignItems: "stretch" },
  backBtn: { alignSelf: "flex-start", width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center", gap: 8 },
  logo: { width: 64, height: 64, borderRadius: 18 },
  brandName: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  brandTag: { fontSize: 13 },
  inviteChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 30, borderWidth: 1, alignSelf: "center",
  },
  inviteText: { fontSize: 13, fontWeight: "600" },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  cardShell: {
    borderRadius: 20, borderWidth: 1, height: 160,
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  cover: { width: "100%", height: 160 },
  coverPlaceholder: { width: "100%", height: 160, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 16, gap: 8 },
  cardMeta: { flexDirection: "row", gap: 8 },
  trackBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  trackText: { fontSize: 11, fontWeight: "600" },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  diffText: { fontSize: 11, fontWeight: "700" },
  cardTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  xpText: { fontSize: 12, fontWeight: "700" },
  price: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  notFound: { fontSize: 14 },
  perks: { gap: 10 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  perkIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  perkText: { flex: 1, fontSize: 13 },
  ctaGroup: { gap: 10 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  btnOutline: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  btnOutlineText: { fontSize: 15, fontWeight: "600" },
  fine: { textAlign: "center", fontSize: 11 },
});
