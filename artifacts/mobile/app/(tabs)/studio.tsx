import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@workspace/supabase";

const LOGO = require("../../assets/images/icon.png");

const TRACK_LABELS: Record<string, string> = {
  product_design: "Design",
  frontend: "Frontend",
  backend: "Backend",
  full_stack: "Full Stack",
  growth: "Growth",
  branding: "Branding",
  mentorship: "Mentor",
  vibe_coding: "Vibe",
  video_editing: "Video",
  motion_design: "Motion",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

export default function StudioScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  // Fetch tutor's bootcamps
  const { data: bootcamps, isLoading, refetch } = useQuery({
    queryKey: ["tutor-bootcamps", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("bootcamps")
        .select(`
          *,
          modules:bootcamp_modules (id),
          enrollments:enrollments (id)
        `)
        .eq("tutor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        modulesCount: b.modules?.length ?? b.modules_count ?? 0,
        enrollmentCount: b.enrollments?.length ?? 0,
        priceCents: b.price_cents,
        xpReward: b.xp_reward,
        coverUrl: b.cover_url,
        deliveryMedium: b.delivery_medium,
        adminReviewed: b.admin_reviewed,
      }));
    },
    enabled: !!user?.id,
  });

  // Aggregate stats
  const totalBootcamps = (bootcamps ?? []).length;
  const totalStudents = (bootcamps ?? []).reduce((sum: number, b: any) => sum + b.enrollmentCount, 0);
  const totalModules = (bootcamps ?? []).reduce((sum: number, b: any) => sum + b.modulesCount, 0);
  const pendingReview = (bootcamps ?? []).filter((b: any) => !b.adminReviewed).length;

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `₦${(cents / 100).toLocaleString("en-NG")}`;
  };

  const isTutor = (user?.tutorVerified ?? 0) >= 1;
  const [activating, setActivating] = React.useState(false);

  const handleBecomeTutor = async () => {
    if (!user?.id) return;
    setActivating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tutor_verified: 1 })
        .eq("id", user.id);
      if (error) throw error;
      // Update local auth state
      await updateUser({
        ...user!,
        tutorVerified: 1,
      });
      refetch();
    } catch (err: any) {
      // ignore
    } finally {
      setActivating(false);
    }
  };

  // Non-tutor onboarding screen
  if (!isTutor) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <Image source={LOGO} style={styles.logo} />
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tutor Studio</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => router.push("/profile")}
                style={[styles.avatarBtn, { backgroundColor: colors.primary + "22" }]}
                activeOpacity={0.7}
              >
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                    {(user?.displayName ?? "U").slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.onboardWrap}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6", "#A78BFA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.onboardHero}
          >
            <Feather name="tv" size={40} color="#fff" />
            <Text style={styles.onboardTitle}>Become a Tutor</Text>
            <Text style={styles.onboardSub}>
              Create bootcamps, teach students, and earn from your expertise. Start building your curriculum today.
            </Text>
          </LinearGradient>
          <View style={styles.onboardFeatures}>
            {[
              { icon: "book-open" as const, text: "Create and manage bootcamps" },
              { icon: "users" as const, text: "Track student progress" },
              { icon: "credit-card" as const, text: "Earn 90% of bootcamp fees" },
              { icon: "layers" as const, text: "Build modular curriculums" },
            ].map((f) => (
              <View key={f.text} style={styles.onboardFeature}>
                <View style={[styles.onboardFeatureIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name={f.icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.onboardFeatureText, { color: colors.foreground }]}>{f.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.onboardBtn, { backgroundColor: colors.primary, opacity: activating ? 0.6 : 1 }]}
            onPress={handleBecomeTutor}
            disabled={activating}
            activeOpacity={0.85}
          >
            {activating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={16} color="#fff" />
                <Text style={styles.onboardBtnText}>Activate Tutor Studio</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header (matches home page) ── */}
      <View style={[styles.header, { paddingTop: topPadding + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tutor Studio</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => router.push("/tutor/create" as never)}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={15} color="#fff" />
              <Text style={styles.createBtnText}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={[styles.avatarBtn, { backgroundColor: colors.primary + "22" }]}
              activeOpacity={0.7}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                  {(user?.displayName ?? "T").slice(0, 1).toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Stats Hero ── */}
        <LinearGradient
          colors={["#6366F1", "#8B5CF6", "#A78BFA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsHero}
        >
          <View style={styles.statsDecoCircle1} />
          <View style={styles.statsDecoCircle2} />
          <View style={styles.statsGrid}>
            {[
              { label: "Bootcamps", value: totalBootcamps, icon: "book" as const },
              { label: "Students", value: totalStudents, icon: "users" as const },
              { label: "Modules", value: totalModules, icon: "layers" as const },
              { label: "Pending", value: pendingReview, icon: "clock" as const },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <View style={styles.statIconWrap}>
                  <Feather name={s.icon} size={14} color="#fff" />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/tutor/create" as never)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="plus-circle" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Create Bootcamp</Text>
            <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>New course</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/bootcamps" as never)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: "#10B98120" }]}>
              <Feather name="eye" size={20} color="#10B981" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Browse All</Text>
            <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>See student view</Text>
          </TouchableOpacity>
        </View>

        {/* ── Bootcamp List ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Bootcamps</Text>
          <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{totalBootcamps}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : totalBootcamps === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="book-open" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bootcamps yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Create your first bootcamp to start teaching and earning.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/tutor/create" as never)}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Create Bootcamp</Text>
            </TouchableOpacity>
          </View>
        ) : (
          (bootcamps ?? []).map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.bootcampCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: "/tutor/[id]", params: { id: item.id } } as never)}
              activeOpacity={0.8}
            >
              <View style={styles.bootcampCardLeft}>
                <View style={styles.bootcampCardTitleRow}>
                  <Text style={[styles.bootcampCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.adminReviewed && (
                    <View style={[styles.pendingBadge, { backgroundColor: "#F59E0B20" }]}>
                      <Text style={{ color: "#F59E0B", fontSize: 10, fontWeight: "700" }}>PENDING</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.bootcampCardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
                <View style={styles.bootcampCardMeta}>
                  <View style={[styles.metaPill, { backgroundColor: (DIFFICULTY_COLORS[item.difficulty] ?? colors.primary) + "20" }]}>
                    <Text style={{ color: DIFFICULTY_COLORS[item.difficulty] ?? colors.primary, fontSize: 10, fontWeight: "700" }}>
                      {item.difficulty?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
                    <Feather name="users" size={10} color={colors.mutedForeground} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: "600" }}>
                      {item.enrollmentCount}
                    </Text>
                  </View>
                  <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
                    <Feather name="layers" size={10} color={colors.mutedForeground} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: "600" }}>
                      {item.modulesCount} modules
                    </Text>
                  </View>
                  <Text style={{ color: colors.xpGold, fontSize: 11, fontWeight: "700" }}>
                    {formatPrice(item.priceCents ?? 0)}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { borderBottomWidth: 1, paddingBottom: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 4, gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  avatarInitials: { fontSize: 14, fontWeight: "700" },

  // Stats hero
  statsHero: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20, overflow: "hidden" },
  statsDecoCircle1: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.08)", top: -30, right: -20 },
  statsDecoCircle2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, left: -10 },
  statsGrid: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", gap: 4 },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "500" },

  // Quick actions
  actionsRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  actionCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  actionSub: { fontSize: 12 },

  // Section
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionCount: { fontSize: 14, fontWeight: "600" },

  // Bootcamp cards
  bootcampCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 10, padding: 16,
    borderRadius: 16, borderWidth: 1,
  },
  bootcampCardLeft: { flex: 1, gap: 4 },
  bootcampCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bootcampCardTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  bootcampCardSub: { fontSize: 12, lineHeight: 16 },
  bootcampCardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Onboarding
  onboardWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 24 },
  onboardHero: { borderRadius: 20, padding: 28, alignItems: "center", gap: 12, overflow: "hidden" },
  onboardTitle: { color: "#fff", fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  onboardSub: { color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  onboardFeatures: { gap: 14 },
  onboardFeature: { flexDirection: "row", alignItems: "center", gap: 14 },
  onboardFeatureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  onboardFeatureText: { fontSize: 14, fontWeight: "600" },
  onboardBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  onboardBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});