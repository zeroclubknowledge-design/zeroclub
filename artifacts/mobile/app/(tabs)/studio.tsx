import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const BASE_URL = () => {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}` : "";
};

export interface TutorBootcamp {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  coverUrl: string | null;
  track: string;
  difficulty: string;
  deliveryMedium: string;
  modulesCount: number;
  xpReward: number;
  priceCents: number;
  adminReviewed: boolean;
  enrollmentCount: number;
  modules: TutorModule[];
  createdAt: string;
}

export interface TutorModule {
  id: string;
  bootcampId: string;
  title: string;
  description: string;
  durationMinutes: number;
  xpReward: number;
  orderIndex: number;
  isPreview: boolean;
  createdAt: string;
}

export interface TutorStats {
  bootcamps: number;
  students: number;
  modules: number;
  totalXpDistributed: number;
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

const DELIVERY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  video: "play-circle",
  live: "radio",
  text: "book-open",
  hybrid: "layers",
};

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `₦${(cents / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

type Segment = "overview" | "bootcamps" | "community";

function NotTutorScreen({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.centerFull, { backgroundColor: colors.background }]}>
      <View style={[styles.notTutorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.notTutorIcon, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="award" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.notTutorTitle, { color: colors.foreground }]}>Become a Tutor</Text>
        <Text style={[styles.notTutorSub, { color: colors.mutedForeground }]}>
          Share your expertise with thousands of African builders. Create bootcamps, manage students, and earn revenue.
        </Text>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/profile" as never)}
          activeOpacity={0.85}
        >
          <Text style={styles.applyBtnText}>Apply as Tutor</Text>
        </TouchableOpacity>
        <Text style={[styles.notTutorHint, { color: colors.mutedForeground }]}>
          Applications reviewed within 48 hours
        </Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, icon, color, colors }: {
  label: string; value: string | number; icon: keyof typeof Feather.glyphMap;
  color: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function StudioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { isDesktop } = useBreakpoint();
  const qc = useQueryClient();
  const [segment, setSegment] = useState<Segment>("overview");

  const topPadding = Platform.OS === "web" ? (isDesktop ? 0 : 16) : insets.top;
  const isTutor = (user?.tutorVerified ?? 0) >= 1;

  const headers = { Authorization: `Bearer ${token ?? ""}` };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<TutorStats>({
    queryKey: ["tutor-stats"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL()}/api/tutor/my-stats`, { headers });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<TutorStats>;
    },
    enabled: isTutor,
  });

  const { data: bootcamps, isLoading: bcLoading, refetch: refetchBc, isRefetching } = useQuery<TutorBootcamp[]>({
    queryKey: ["tutor-bootcamps"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL()}/api/tutor/my-bootcamps`, { headers });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<TutorBootcamp[]>;
    },
    enabled: isTutor,
  });

  const onRefresh = useCallback(() => {
    void refetchStats();
    void refetchBc();
  }, [refetchStats, refetchBc]);

  if (!isTutor) return <NotTutorScreen colors={colors} />;

  const SEGMENTS: { key: Segment; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "bootcamps", label: "Bootcamps" },
    { key: "community", label: "Community" },
  ];

  const OverviewSegment = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {statsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>YOUR STATS</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Bootcamps" value={stats?.bootcamps ?? 0} icon="book" color={colors.primary} colors={colors} />
            <StatCard label="Students" value={stats?.students ?? 0} icon="users" color="#10B981" colors={colors} />
            <StatCard label="Modules" value={stats?.modules ?? 0} icon="layers" color="#F59E0B" colors={colors} />
            <StatCard label="XP Distributed" value={stats?.totalXpDistributed ?? 0} icon="zap" color="#8B5CF6" colors={colors} />
          </View>

          <View style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginBottom: 10 }]}>QUICK ACTIONS</Text>
            <TouchableOpacity
              style={[styles.quickActionRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push("/tutor/create" as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="plus" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.qaTitle, { color: colors.foreground }]}>Create a New Bootcamp</Text>
                <Text style={[styles.qaSub, { color: colors.mutedForeground }]}>Design your curriculum and go live</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionRow}
              onPress={() => setSegment("bootcamps")}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, { backgroundColor: "#10B981" + "20" }]}>
                <Feather name="edit-3" size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.qaTitle, { color: colors.foreground }]}>Manage Your Bootcamps</Text>
                <Text style={[styles.qaSub, { color: colors.mutedForeground }]}>Edit modules, pricing, and settings</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {(bootcamps?.length ?? 0) > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT BOOTCAMPS</Text>
              {bootcamps?.slice(0, 3).map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: "/tutor/[id]", params: { id: b.id } } as never)}
                  activeOpacity={0.8}
                >
                  {b.coverUrl && (
                    <Image
                      source={{ uri: b.coverUrl.startsWith("/") ? `${BASE_URL()}/api${b.coverUrl}` : b.coverUrl }}
                      style={styles.recentCover}
                    />
                  )}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.recentTitle, { color: colors.foreground }]} numberOfLines={1}>{b.title}</Text>
                    <Text style={[styles.recentSub, { color: colors.mutedForeground }]} numberOfLines={1}>{b.subtitle}</Text>
                    <View style={styles.recentMeta}>
                      <Feather name="users" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.recentMetaText, { color: colors.mutedForeground }]}>{b.enrollmentCount} students</Text>
                      <Text style={[styles.recentMetaText, { color: colors.mutedForeground }]}>·</Text>
                      <Feather name="layers" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.recentMetaText, { color: colors.mutedForeground }]}>{b.modulesCount} modules</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const BootcampsSegment = (
    <View style={{ flex: 1 }}>
      {bcLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={bootcamps ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="book" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bootcamps yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Create your first bootcamp to start teaching</Text>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/tutor/create" as never)}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.createBtnText}>Create Bootcamp</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: b }) => (
            <TouchableOpacity
              style={[styles.bcCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: "/tutor/[id]", params: { id: b.id } } as never)}
              activeOpacity={0.8}
            >
              <View style={styles.bcCardTop}>
                {b.coverUrl ? (
                  <Image
                    source={{ uri: b.coverUrl.startsWith("/") ? `${BASE_URL()}/api${b.coverUrl}` : b.coverUrl }}
                    style={styles.bcCover}
                  />
                ) : (
                  <View style={[styles.bcCoverPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="book" size={20} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.bcBadges}>
                    <View style={[styles.badge, { backgroundColor: (DIFFICULTY_COLORS[b.difficulty] ?? colors.primary) + "20" }]}>
                      <Text style={[styles.badgeText, { color: DIFFICULTY_COLORS[b.difficulty] ?? colors.primary }]}>
                        {b.difficulty}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                      <Feather name={DELIVERY_ICONS[b.deliveryMedium] ?? "play-circle"} size={10} color={colors.primary} />
                      <Text style={[styles.badgeText, { color: colors.primary }]}>{b.deliveryMedium}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: b.priceCents === 0 ? "#10B981" + "20" : "#F59E0B" + "20" }]}>
                      <Text style={[styles.badgeText, { color: b.priceCents === 0 ? "#10B981" : "#F59E0B" }]}>
                        {formatPrice(b.priceCents)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.bcTitle, { color: colors.foreground }]} numberOfLines={1}>{b.title}</Text>
                  <Text style={[styles.bcSub, { color: colors.mutedForeground }]} numberOfLines={1}>{b.subtitle}</Text>
                </View>
              </View>
              <View style={[styles.bcFooter, { borderTopColor: colors.border }]}>
                <View style={styles.bcStat}>
                  <Feather name="users" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.bcStatText, { color: colors.mutedForeground }]}>{b.enrollmentCount} students</Text>
                </View>
                <View style={styles.bcStat}>
                  <Feather name="layers" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.bcStatText, { color: colors.mutedForeground }]}>{b.modulesCount} modules</Text>
                </View>
                <View style={styles.bcStat}>
                  <Feather name="zap" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.bcStatText, { color: colors.mutedForeground }]}>{b.xpReward} XP</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: b.adminReviewed ? "#10B981" + "20" : "#F59E0B" + "20" }]}>
                  <Text style={[styles.badgeText, { color: b.adminReviewed ? "#10B981" : "#F59E0B" }]}>
                    {b.adminReviewed ? "Live" : "Pending"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const CommunitySegment = (
    <View style={{ flex: 1 }}>
      {bcLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (bootcamps?.length ?? 0) === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="message-circle" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No community yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Create a bootcamp to get community channels</Text>
        </View>
      ) : (
        <FlatList
          data={bootcamps ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item: b }) => (
            <TouchableOpacity
              style={[styles.communityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: "/tutor/[id]", params: { id: b.id, tab: "community" } } as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.communityIcon, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="hash" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.bcTitle, { color: colors.foreground }]} numberOfLines={1}>{b.title}</Text>
                <Text style={[styles.bcSub, { color: colors.mutedForeground }]}>4 channels · Admin access</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="shield" size={10} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>Admin</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tutor Studio</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {user?.displayName ?? "Your workspace"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.createFab, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/tutor/create" as never)}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={15} color="#fff" />
            <Text style={styles.createFabText}>Create</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.segControl, { backgroundColor: colors.muted }]}>
          {SEGMENTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.segItem, segment === s.key && { backgroundColor: colors.card }]}
              onPress={() => setSegment(s.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segText, { color: segment === s.key ? colors.foreground : colors.mutedForeground }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {segment === "overview" && OverviewSegment}
      {segment === "bootcamps" && BootcampsSegment}
      {segment === "community" && CommunitySegment}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, marginTop: 1 },
  createFab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  createFabText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  segControl: {
    flexDirection: "row", borderRadius: 12, padding: 3, gap: 2,
  },
  segItem: {
    flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 10,
  },
  segText: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 6, alignItems: "flex-start",
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11 },
  quickActionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  quickActionRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1,
  },
  qaIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  qaTitle: { fontSize: 14, fontWeight: "600" },
  qaSub: { fontSize: 12, marginTop: 1 },
  recentCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  recentCover: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#2A2A2A" },
  recentTitle: { fontSize: 13, fontWeight: "600" },
  recentSub: { fontSize: 11 },
  recentMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  recentMetaText: { fontSize: 10 },
  bcCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  bcCardTop: { flexDirection: "row", gap: 12, padding: 12 },
  bcCover: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#2A2A2A" },
  bcCoverPlaceholder: { width: 56, height: 56, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  bcBadges: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  bcTitle: { fontSize: 14, fontWeight: "700" },
  bcSub: { fontSize: 12 },
  bcFooter: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1,
  },
  bcStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  bcStatText: { fontSize: 11 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  badgeText: { fontSize: 10, fontWeight: "600" },
  communityCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  communityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 10 },
  emptySub: { fontSize: 13, textAlign: "center", maxWidth: 260 },
  createBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  centerFull: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notTutorCard: {
    borderRadius: 20, borderWidth: 1, padding: 28,
    alignItems: "center", gap: 12, width: "100%", maxWidth: 380,
  },
  notTutorIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  notTutorTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  notTutorSub: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  applyBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    marginTop: 6, width: "100%", alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  notTutorHint: { fontSize: 11, textAlign: "center" },
});
