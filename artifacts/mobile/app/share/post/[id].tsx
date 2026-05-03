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

interface PostPreview {
  id: string;
  body: string;
  imageUrl?: string | null;
  track: string;
  xpAwarded: number;
  isProofProject: boolean;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    level: number;
  };
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

export default function SharePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, ref } = useLocalSearchParams<{ id: string; ref?: string }>();
  const { token } = useAuth();
  const [post, setPost] = useState<PostPreview | null>(null);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 24 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  useEffect(() => {
    if (!id) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const base = domain ? `https://${domain}` : "";
    fetch(`${base}/api/posts/${id}/preview`)
      .then((r) => r.json())
      .then((d: PostPreview) => setPost(d))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    await storePendingShare(ref ?? null, { type: "post", id });
    router.push("/register");
  };

  const handleSignIn = async () => {
    await storePendingShare(ref ?? null, { type: "post", id });
    router.push("/login");
  };

  const handleOpen = () => {
    router.replace({ pathname: "/post/[id]", params: { id } } as never);
  };

  const imageUri = post?.imageUrl?.startsWith("/")
    ? `${process.env["EXPO_PUBLIC_DOMAIN"] ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}` : ""}${post.imageUrl}`
    : post?.imageUrl ?? undefined;

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
        <Feather name="share-2" size={13} color={colors.primary} />
        <Text style={[styles.inviteText, { color: colors.primary }]}>
          Someone shared a build with you
        </Text>
      </View>

      {/* Post card */}
      {loading ? (
        <View style={[styles.cardShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : post ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Author */}
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {post.author.avatarUrl ? (
                <Image source={{ uri: post.author.avatarUrl }} style={StyleSheet.absoluteFillObject} borderRadius={20} />
              ) : (
                <Text style={[styles.avatarText, { color: "#fff" }]}>
                  {(post.author.displayName[0] ?? "?").toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.authorRow}>
                <Text style={[styles.displayName, { color: colors.foreground }]}>{post.author.displayName}</Text>
                <View style={[styles.levelBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.levelText, { color: colors.primary }]}>Lv{post.author.level}</Text>
                </View>
              </View>
              <Text style={[styles.username, { color: colors.mutedForeground }]}>@{post.author.username}</Text>
            </View>
            {post.isProofProject && (
              <View style={[styles.proofBadge, { backgroundColor: colors.primary }]}>
                <Feather name="zap" size={10} color="#fff" />
                <Text style={styles.proofText}>PROOF</Text>
              </View>
            )}
          </View>

          {/* Body */}
          <Text style={[styles.body, { color: colors.foreground }]} numberOfLines={4}>
            {post.body}
          </Text>

          {/* Image */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.postImage} resizeMode="cover" />
          )}

          {/* Meta */}
          <View style={styles.cardMeta}>
            <View style={[styles.trackBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.trackText, { color: colors.mutedForeground }]}>
                {TRACK_LABELS[post.track] ?? post.track}
              </Text>
            </View>
            <View style={styles.xpRow}>
              <Feather name="zap" size={12} color="#F59E0B" />
              <Text style={[styles.xpText, { color: "#F59E0B" }]}>+{post.xpAwarded} XP</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.cardShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="file-text" size={32} color={colors.mutedForeground} />
          <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Post unavailable</Text>
        </View>
      )}

      {/* Perks */}
      <View style={styles.perks}>
        {[
          { icon: "edit-3" as const, text: "Share your builds and get proof-of-work" },
          { icon: "zap" as const, text: "Earn XP for every post and interaction" },
          { icon: "users" as const, text: "Join Africa's most serious builder community" },
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
          <Feather name="arrow-right" size={18} color="#fff" />
          <Text style={styles.btnText}>View Full Post</Text>
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
  content: { paddingHorizontal: 24, gap: 20 },
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
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { fontSize: 16, fontWeight: "700" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  displayName: { fontSize: 14, fontWeight: "600" },
  levelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontSize: 10, fontWeight: "700" },
  username: { fontSize: 12, marginTop: 1 },
  proofBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 3 },
  proofText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 10 },
  postImage: { width: "100%", height: 160 },
  cardMeta: { flexDirection: "row", alignItems: "center", padding: 14, paddingTop: 10, gap: 8 },
  trackBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  trackText: { fontSize: 11, fontWeight: "500" },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  xpText: { fontSize: 11, fontWeight: "700" },
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
