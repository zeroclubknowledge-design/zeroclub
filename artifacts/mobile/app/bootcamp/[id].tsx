import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { PaymentModal } from "@/components/PaymentModal";
import { supabase } from "@workspace/supabase";

interface BootcampModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  xpReward: number;
  orderIndex: number;
}

const TRACK_LABELS: Record<string, string> = {
  product_design: "Product Design",
  frontend: "Frontend",
  growth: "Growth",
  branding: "Branding",
  mentorship: "Mentorship",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

const TRACK_GRADIENTS: Record<string, [string, string]> = {
  product_design: ["#7C3AED", "#4F46E5"],
  frontend: ["#2563EB", "#0EA5E9"],
  growth: ["#D97706", "#F59E0B"],
  branding: ["#6366F1", "#9333EA"],
  mentorship: ["#059669", "#10B981"],
};

function formatPrice(priceCents: number): string {
  if (priceCents === 0) return "Free";
  return `₦${(priceCents / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function BootcampDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { user, token } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: bootcamp, isLoading, refetch } = useQuery({
    queryKey: ["bootcamp", id, user?.id],
    queryFn: async () => {
      if (!id) return null;
      const { data: bData, error: bError } = await supabase
        .from("bootcamps")
        .select(`
          *,
          modules:bootcamp_modules (*)
        `)
        .eq("id", id)
        .single();

      if (bError) throw bError;

      let enrollment = null;
      if (user?.id) {
        const { data: eData, error: eError } = await supabase
          .from("enrollments")
          .select("*")
          .eq("bootcamp_id", id)
          .eq("user_id", user.id)
          .single();
        if (!eError) enrollment = eData;
      }

      return {
        ...bData,
        enrolled: !!enrollment,
        enrollment: enrollment ? {
          ...enrollment,
          modulesCompleted: enrollment.modules_completed,
        } : null,
        deliveryMedium: bData.delivery_medium,
        modulesCount: bData.modules_count,
        xpReward: bData.xp_reward,
        priceCents: bData.price_cents,
        modules: (bData.modules || []).sort((a: any, b: any) => a.order_index - b.order_index).map((m: any) => ({
          ...m,
          durationMinutes: m.duration_minutes,
          xpReward: m.xp_reward,
          orderIndex: m.order_index,
        })),
      };
    },
    enabled: !!id,
  });

  const handleEnroll = async () => {
    if (!bootcamp || !user) return;
    if ((bootcamp.priceCents ?? 0) > 0) {
      setShowPayment(true);
    } else {
      setIsUpdating(true);
      const { error } = await supabase.from("enrollments").insert({
        id: `${user.id}-${id}`,
        user_id: user.id,
        bootcamp_id: id!,
        modules_completed: 0,
        progress: 0,
        paid: false,
      });
      setIsUpdating(false);
      if (error) {
        showToast({ type: "error", title: "Enrollment failed", message: error.message });
      } else {
        showToast({ type: "success", title: "Enrolled!", message: "Welcome to the bootcamp." });
        refetch();
        qc.invalidateQueries({ queryKey: ["bootcamps"] });
        qc.invalidateQueries({ queryKey: ["my-bootcamps"] });
      }
    }
  };

  const handlePaymentSuccess = async (paymentRef: string) => {
    setShowPayment(false);
    if (!user) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from("enrollments").insert({
        id: `${user.id}-${id}`,
        user_id: user.id,
        bootcamp_id: id!,
        modules_completed: 0,
        progress: 0,
        paid: true,
        payment_ref: paymentRef,
      });
      if (error) throw error;
      showToast({ type: "success", title: "Payment successful", message: "You are now enrolled!" });
      refetch();
      qc.invalidateQueries({ queryKey: ["bootcamps"] });
      qc.invalidateQueries({ queryKey: ["my-bootcamps"] });
    } catch (err: any) {
      showToast({ type: "error", title: "Enrollment failed", message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteModule = async (moduleIndex: number) => {
    if (!bootcamp?.enrollment || !user) return;
    const current = bootcamp.enrollment.modulesCompleted ?? 0;
    if (moduleIndex !== current) return;
    
    setIsUpdating(true);
    const nextModules = current + 1;
    const nextProgress = Math.min(100, Math.round((nextModules / bootcamp.modulesCount) * 100));

    const { error } = await supabase
      .from("enrollments")
      .update({
        modules_completed: nextModules,
        progress: nextProgress,
        completed_at: nextProgress === 100 ? new Date().toISOString() : null,
      })
      .eq("bootcamp_id", id!)
      .eq("user_id", user.id);

    setIsUpdating(false);
    if (error) {
      showToast({ type: "error", title: "Update failed", message: error.message });
    } else {
      refetch();
      qc.invalidateQueries({ queryKey: ["bootcamps"] });
      qc.invalidateQueries({ queryKey: ["my-bootcamps"] });
    }
  };

  const topPadding = Platform.OS === "web" ? 20 : insets.top;
  const gradient = TRACK_GRADIENTS[bootcamp?.track ?? "frontend"] ?? ["#1A1A1A", "#0D0D0D"];

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!bootcamp) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Bootcamp not found</Text>
      </View>
    );
  }

  const modulesCompleted = bootcamp.enrollment?.modulesCompleted ?? 0;
  const progress = bootcamp.enrollment?.progress ?? 0;
  const isPaid = (bootcamp.priceCents ?? 0) > 0;
  const isCompleted = progress === 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Header */}
        <LinearGradient colors={gradient} style={[styles.hero, { paddingTop: topPadding + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{TRACK_LABELS[bootcamp.track] ?? bootcamp.track}</Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: DIFFICULTY_COLORS[bootcamp.difficulty] + "33" }]}>
              <Text style={[styles.heroBadgeText, { color: DIFFICULTY_COLORS[bootcamp.difficulty] }]}>
                {bootcamp.difficulty.charAt(0).toUpperCase() + bootcamp.difficulty.slice(1)}
              </Text>
            </View>
            {bootcamp.deliveryMedium && (
              <View style={[styles.heroBadge, { backgroundColor: "rgba(99,102,241,0.25)" }]}>
                <Feather
                  name={
                    bootcamp.deliveryMedium === "video" ? "play-circle" :
                    bootcamp.deliveryMedium === "live" ? "radio" :
                    bootcamp.deliveryMedium === "text" ? "book-open" : "layers"
                  }
                  size={11}
                  color="#A5B4FC"
                />
                <Text style={[styles.heroBadgeText, { color: "#A5B4FC" }]}>
                  {bootcamp.deliveryMedium.charAt(0).toUpperCase() + bootcamp.deliveryMedium.slice(1)}
                </Text>
              </View>
            )}
            {isPaid ? (
              <View style={[styles.heroBadge, { backgroundColor: "#F59E0B33" }]}>
                <Feather name="star" size={11} color="#F59E0B" />
                <Text style={[styles.heroBadgeText, { color: "#F59E0B" }]}>Premium</Text>
              </View>
            ) : (
              <View style={[styles.heroBadge, { backgroundColor: "#10B98133" }]}>
                <Text style={[styles.heroBadgeText, { color: "#10B981" }]}>Free</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroTitle}>{bootcamp.title}</Text>
          <Text style={styles.heroSubtitle}>{bootcamp.subtitle}</Text>

          {/* Stats row */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Feather name="layers" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroStatText}>{bootcamp.modulesCount} modules</Text>
            </View>
            <View style={styles.heroStat}>
              <Feather name="zap" size={13} color="#F59E0B" />
              <Text style={styles.heroStatText}>+{bootcamp.xpReward} XP</Text>
            </View>
            <View style={styles.heroStat}>
              <Feather name="tag" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroStatText}>{formatPrice(bootcamp.priceCents ?? 0)}</Text>
            </View>
          </View>

          {/* Progress if enrolled */}
          {bootcamp.enrolled && (
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Your Progress</Text>
                <Text style={styles.progressPct}>{progress}%</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progress}%` as `${number}%` }]} />
              </View>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Feather name="award" size={13} color="#F59E0B" />
                  <Text style={styles.completedText}>Bootcamp Complete!</Text>
                </View>
              )}
            </View>
          )}
        </LinearGradient>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About this Bootcamp</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{bootcamp.description}</Text>
        </View>

        {/* Modules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Curriculum · {bootcamp.modulesCount} Modules
          </Text>

          {bootcamp.modules && bootcamp.modules.length > 0 ? (
            bootcamp.modules.map((module, index) => {
              const isModuleCompleted = index < modulesCompleted;
              const isModuleActive = bootcamp.enrolled && index === modulesCompleted && !isCompleted;
              const isModuleLocked = !bootcamp.enrolled || index > modulesCompleted;

              return (
                <View
                  key={module.id}
                  style={[
                    styles.moduleItem,
                    {
                      backgroundColor: isModuleActive ? colors.primary + "15" : colors.card,
                      borderColor: isModuleActive ? colors.primary + "60" : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.moduleNumber,
                      {
                        backgroundColor: isModuleCompleted
                          ? colors.success
                          : isModuleActive
                            ? colors.primary
                            : colors.muted,
                      },
                    ]}
                  >
                    {isModuleCompleted ? (
                      <Feather name="check" size={12} color="#fff" />
                    ) : isModuleLocked ? (
                      <Feather name="lock" size={11} color={colors.mutedForeground} />
                    ) : (
                      <Text style={styles.moduleNumberText}>{index + 1}</Text>
                    )}
                  </View>

                  <View style={styles.moduleContent}>
                    <Text
                      style={[
                        styles.moduleTitle,
                        {
                          color: isModuleLocked ? colors.mutedForeground : colors.foreground,
                          fontWeight: isModuleActive ? "700" : "600",
                        },
                      ]}
                    >
                      {module.title}
                    </Text>
                    <Text
                      style={[styles.moduleDesc, { color: colors.mutedForeground }]}
                      numberOfLines={isModuleActive ? 3 : 2}
                    >
                      {module.description}
                    </Text>
                    <View style={styles.moduleMeta}>
                      <View style={styles.metaChip}>
                        <Feather name="clock" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {module.durationMinutes} min
                        </Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Feather name="zap" size={11} color={colors.xpGold} />
                        <Text style={[styles.metaText, { color: colors.xpGold }]}>
                          +{module.xpReward} XP
                        </Text>
                      </View>
                    </View>

                    {isModuleActive && (
                      <TouchableOpacity
                        style={[styles.completeBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleCompleteModule(index)}
                        disabled={updateProgress.isPending}
                        activeOpacity={0.85}
                      >
                        {updateProgress.isPending ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Feather name="check-circle" size={14} color="#fff" />
                            <Text style={styles.completeBtnText}>Mark Complete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyModules, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="layers" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyModulesText, { color: colors.mutedForeground }]}>
                Modules coming soon
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      {!bootcamp.enrolled && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          {isPaid && (
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
              One-time payment · Lifetime access
            </Text>
          )}
          <TouchableOpacity
            style={[styles.enrollBtn, { backgroundColor: colors.primary }]}
            onPress={handleEnroll}
            disabled={enroll.isPending}
            activeOpacity={0.85}
          >
            {enroll.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                {isPaid ? (
                  <>
                    <Feather name="credit-card" size={16} color="#fff" />
                    <Text style={styles.enrollBtnText}>Pay {formatPrice(bootcamp.priceCents ?? 0)} to Enroll</Text>
                  </>
                ) : (
                  <>
                    <Feather name="zap" size={16} color="#fff" />
                    <Text style={styles.enrollBtnText}>Enroll for Free</Text>
                  </>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <PaymentModal
        visible={showPayment}
        bootcampTitle={bootcamp.title}
        priceCents={bootcamp.priceCents ?? 0}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { flexGrow: 1 },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 32,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
    marginBottom: 14,
  },
  heroStats: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroStatText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  progressSection: {
    marginTop: 16,
    gap: 6,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  progressPct: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  progressBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  completedText: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 22,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  moduleItem: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  moduleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  moduleNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  moduleContent: {
    flex: 1,
    gap: 4,
  },
  moduleTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  moduleDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  moduleMeta: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "500",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  completeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  emptyModules: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyModulesText: {
    fontSize: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  priceLabel: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 8,
  },
  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  enrollBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
