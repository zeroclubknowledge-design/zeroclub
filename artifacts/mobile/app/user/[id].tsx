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
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  track: string;
  school?: string | null;
  level: number;
  xpBalance: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean | null;
}

export default function UserProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const { showToast } = useToast();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = user?.id === id;

  const fetchProfile = async () => {
    if (!id) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    try {
      const res = await fetch(`${baseUrl}/api/profiles/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Not found");
      const data = await res.json() as PublicProfile;
      setProfile(data);
    } catch {
      showToast({ type: "error", title: "Could not load profile" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleFollow = async () => {
    if (!profile || !token) return;
    setFollowLoading(true);
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    const method = profile.isFollowing ? "DELETE" : "POST";
    try {
      const res = await fetch(`${baseUrl}/api/profiles/${profile.id}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { following: boolean; followerCount: number };
      setProfile((prev) =>
        prev
          ? { ...prev, isFollowing: data.following, followerCount: data.followerCount }
          : prev,
      );
    } catch {
      showToast({ type: "error", title: "Could not update follow status" });
    } finally {
      setFollowLoading(false);
    }
  };

  const initials = (profile?.displayName ?? "?").slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {profile?.username ? `@${profile.username}` : "Profile"}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={StyleSheet.absoluteFillObject}
                  borderRadius={44}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>

            <Text style={[styles.displayName, { color: colors.foreground }]}>{profile.displayName}</Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>@{profile.username}</Text>

            {profile.bio && (
              <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>
            )}

            {profile.school && (
              <View style={[styles.schoolBadge, { backgroundColor: colors.muted }]}>
                <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                <Text style={[styles.schoolText, { color: colors.mutedForeground }]}>
                  {profile.school}
                </Text>
              </View>
            )}

            {/* Follow stats */}
            <View style={styles.followRow}>
              <View style={styles.followStat}>
                <Text style={[styles.followCount, { color: colors.foreground }]}>
                  {profile.followerCount.toLocaleString()}
                </Text>
                <Text style={[styles.followLabel, { color: colors.mutedForeground }]}>Followers</Text>
              </View>
              <View style={[styles.followDivider, { backgroundColor: colors.border }]} />
              <View style={styles.followStat}>
                <Text style={[styles.followCount, { color: colors.foreground }]}>
                  {profile.followingCount.toLocaleString()}
                </Text>
                <Text style={[styles.followLabel, { color: colors.mutedForeground }]}>Following</Text>
              </View>
            </View>

            {/* Follow button */}
            {!isOwnProfile && (
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  {
                    backgroundColor: profile.isFollowing ? colors.muted : colors.primary,
                    borderColor: profile.isFollowing ? colors.border : colors.primary,
                  },
                ]}
                onPress={handleFollow}
                disabled={followLoading}
                activeOpacity={0.85}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={profile.isFollowing ? colors.foreground : "#fff"} />
                ) : (
                  <>
                    <Feather
                      name={profile.isFollowing ? "user-check" : "user-plus"}
                      size={15}
                      color={profile.isFollowing ? colors.foreground : "#fff"}
                    />
                    <Text
                      style={[
                        styles.followBtnText,
                        { color: profile.isFollowing ? colors.foreground : "#fff" },
                      ]}
                    >
                      {profile.isFollowing ? "Following" : "Follow"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isOwnProfile && (
              <TouchableOpacity
                style={[styles.followBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => router.push("/profile" as never)}
                activeOpacity={0.85}
              >
                <Feather name="edit-2" size={15} color={colors.foreground} />
                <Text style={[styles.followBtnText, { color: colors.foreground }]}>My Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.levelText}>{profile.level}</Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Level</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <View style={styles.xpRow}>
                <Feather name="zap" size={14} color={colors.xpGold} />
                <Text style={[styles.statValue, { color: colors.xpGold }]}>
                  {profile.xpBalance.toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Zero Points</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <View style={[styles.trackPill, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.trackText, { color: colors.primary }]}>
                  {(TRACK_LABELS[profile.track] ?? profile.track).split(" ")[0]}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Track</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loadingState}>
          <Feather name="user-x" size={36} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Profile not found</Text>
        </View>
      )}
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
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  errorText: { fontSize: 15 },
  content: { padding: 16, gap: 12 },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 6,
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
  followRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 24 },
  followStat: { alignItems: "center", gap: 2 },
  followCount: { fontSize: 20, fontWeight: "800" },
  followLabel: { fontSize: 11, fontWeight: "500" },
  followDivider: { width: 1, height: 28 },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  followBtnText: { fontSize: 15, fontWeight: "700" },
  statsCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 5 },
  statDivider: { width: 1, height: 36, marginHorizontal: 4 },
  levelBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  levelText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "500" },
  trackPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  trackText: { fontSize: 12, fontWeight: "700" },
});
