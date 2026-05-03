import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

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

interface ProfileCounts {
  followerCount: number;
  followingCount: number;
  xpBalance: number;
  fundsBalance: number;
  level: number;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const { showToast } = useToast();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [counts, setCounts] = useState<ProfileCounts | null>(null);

  useEffect(() => {
    if (!user?.id || !token) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    fetch(`${baseUrl}/api/profiles/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const d = data as ProfileCounts;
        setCounts({
          followerCount: d.followerCount ?? 0,
          followingCount: d.followingCount ?? 0,
          xpBalance: d.xpBalance ?? user.xpBalance,
          fundsBalance: d.fundsBalance ?? 0,
          level: d.level ?? user.level,
        });
      })
      .catch(() => {});
  }, [user?.id, token]);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ type: "warning", title: "Permission needed", message: "Allow access to your photo library to update your avatar." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !token || !user) return;

    setAvatarUploading(true);
    try {
      const uri = result.assets[0].uri;
      const filename = uri.split("/").pop() ?? "avatar.jpg";
      const formData = new FormData();
      formData.append("file", { uri, name: filename, type: "image/jpeg" } as unknown as Blob);
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const baseUrl = domain ? `https://${domain}` : "";

      const uploadRes = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json() as { url: string };
      const avatarUrl = `${baseUrl}${url}`;

      const updateRes = await fetch(`${baseUrl}/api/profiles/${user.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl }),
      });
      if (!updateRes.ok) throw new Error("Profile update failed");
      const updated = await updateRes.json() as typeof user;
      await updateUser({ ...user, ...updated, avatarUrl });
    } catch {
      showToast({ type: "error", title: "Could not update photo", message: "Try again." });
    } finally {
      setAvatarUploading(false);
    }
  };

  const initials = (user?.displayName ?? "U").slice(0, 2).toUpperCase();
  const followerCount = counts?.followerCount ?? user?.followerCount ?? 0;
  const followingCount = counts?.followingCount ?? user?.followingCount ?? 0;
  const xpBalance = counts?.xpBalance ?? user?.xpBalance ?? 0;
  const level = counts?.level ?? user?.level ?? 1;

  const menuItems = [
    {
      icon: "award" as const,
      label: "Zero Club Levels",
      subtitle: "View your rank & ambassador tiers",
      onPress: () => router.push("/club-levels" as never),
      accent: "#D4387C",
    },
    {
      icon: "check-circle" as const,
      label: "Zero Proof",
      subtitle: "How proof multipliers work",
      onPress: () => router.push("/zero-proof" as never),
      accent: "#10B981",
    },
    {
      icon: "book" as const,
      label: "My Bootcamps",
      subtitle: "View enrolled courses",
      onPress: () => router.push("/my-bootcamps" as never),
      accent: colors.primary,
    },
    {
      icon: "users" as const,
      label: "Refer & Earn",
      subtitle: "Invite students and earn XP",
      onPress: () => router.push("/referral" as never),
      accent: "#8B5CF6",
    },
    {
      icon: "settings" as const,
      label: "Settings",
      subtitle: "Profile, bank account, account",
      onPress: () => router.push("/settings" as never),
      accent: colors.mutedForeground,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Profile</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/settings" as never)}>
          <Feather name="settings" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Avatar */}
          <TouchableOpacity
            onPress={handlePickAvatar}
            activeOpacity={0.8}
            style={styles.avatarWrap}
            disabled={avatarUploading}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={StyleSheet.absoluteFillObject}
                  borderRadius={44}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={[styles.cameraOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {avatarUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="camera" size={12} color={colors.foreground} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.displayName, { color: colors.foreground }]}>{user?.displayName}</Text>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user?.username}</Text>

          {user?.bio && (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>{user.bio}</Text>
          )}

          {user?.school && (
            <View style={[styles.schoolBadge, { backgroundColor: colors.muted }]}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text style={[styles.schoolText, { color: colors.mutedForeground }]}>{user.school}</Text>
            </View>
          )}

          {/* Followers / Following */}
          <View style={styles.followRow}>
            <TouchableOpacity
              style={styles.followStat}
              onPress={() => router.push({ pathname: "/followers", params: { userId: user?.id } } as never)}
              activeOpacity={0.7}
            >
              <Text style={[styles.followCount, { color: colors.foreground }]}>
                {followerCount.toLocaleString()}
              </Text>
              <Text style={[styles.followLabel, { color: colors.mutedForeground }]}>Followers</Text>
            </TouchableOpacity>
            <View style={[styles.followDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.followStat}
              onPress={() => router.push({ pathname: "/following", params: { userId: user?.id } } as never)}
              activeOpacity={0.7}
            >
              <Text style={[styles.followCount, { color: colors.foreground }]}>
                {followingCount.toLocaleString()}
              </Text>
              <Text style={[styles.followLabel, { color: colors.mutedForeground }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.levelText}>{level}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Level</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={styles.xpRow}>
              <Feather name="zap" size={14} color={colors.xpGold} />
              <Text style={[styles.statValue, { color: colors.xpGold }]}>
                {xpBalance.toLocaleString()}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Zero Points</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.trackPill, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.trackText, { color: colors.primary }]}>
                {(TRACK_LABELS[user?.track ?? "frontend"] ?? "").split(" ")[0] ?? "—"}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Track</Text>
          </View>
        </View>

        {/* Navigation menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {menuItems.map((item, i) => (
            <View key={item.label}>
              {i > 0 && <View style={[styles.menuSep, { backgroundColor: colors.border }]} />}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: item.accent + "20" }]}>
                  <Feather name={item.icon} size={17} color={item.accent} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}
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
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 12 },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  avatarWrap: { position: "relative", marginBottom: 6 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  displayName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  username: { fontSize: 14, fontWeight: "500" },
  bio: { fontSize: 13, lineHeight: 18, textAlign: "center" },
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
  followRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 24,
  },
  followStat: { alignItems: "center", gap: 2 },
  followCount: { fontSize: 20, fontWeight: "800" },
  followLabel: { fontSize: 11, fontWeight: "500" },
  followDivider: { width: 1, height: 28 },
  statsCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 5 },
  statDivider: { width: 1, height: 36, marginHorizontal: 4 },
  levelBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "500" },
  trackPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  trackText: { fontSize: 12, fontWeight: "700" },
  menuCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "600" },
  menuSub: { fontSize: 12, marginTop: 1 },
  menuSep: { height: 1, marginHorizontal: 16 },
});
