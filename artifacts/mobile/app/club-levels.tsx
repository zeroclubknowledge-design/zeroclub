import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getGetWalletQueryOptions, getGetWalletQueryKey } from "@workspace/api-client-react";

interface SubscriptionPlan {
  id: string;
  level: number;
  name: string;
  monthlyPriceKobo: number;
  yearlyPriceKobo: number;
  bestFor: string;
  features: string[];
  copy: string;
  color: string;
  icon: string;
  plusPrefix?: string;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "learn",
    level: 2,
    name: "Zero Club Learn",
    monthlyPriceKobo: 350_000,
    yearlyPriceKobo: 4_200_000,
    bestFor: "Students focused on learning digital skills and building consistency.",
    features: [
      "Access to core bootcamps",
      "Tutor-led learning experience",
      "XP earning system",
      "Daily skill challenges",
      "Project posting access",
      "Basic AI Study Buddy",
      "Skill progression tracking",
      "Community feed access",
      "Certificates of completion",
      "Streak rewards & leveling"
    ],
    copy: "Learn real digital skills, earn XP, build projects, and grow consistently without sacrificing school.",
    color: "#D4387C",
    icon: "book"
  },
  {
    id: "network",
    level: 3,
    name: "Zero Club Network",
    monthlyPriceKobo: 500_000,
    yearlyPriceKobo: 6_000_000,
    bestFor: "Students who want learning + networking + visibility + collaboration.",
    plusPrefix: "Everything in Learn PLUS",
    features: [
      "Private networking rooms",
      "Collaboration groups",
      "Accountability circles",
      "Premium bootcamps",
      "Tutor Q&A sessions",
      "Project visibility boosts",
      "Portfolio showcase features",
      "Priority challenge access",
      "Advanced AI Study Buddy",
      "XP multiplier rewards",
      "Exclusive student opportunities"
    ],
    copy: "Learn, connect, collaborate, and grow with ambitious students building real digital careers.",
    color: "#8B5CF6",
    icon: "users"
  },
  {
    id: "irl",
    level: 4,
    name: "Zero Club IRL",
    monthlyPriceKobo: 1_000_000,
    yearlyPriceKobo: 12_000_000,
    bestFor: "Students who want premium access, real-world networking, and elite opportunities.",
    plusPrefix: "Everything in Network PLUS",
    features: [
      "IRL events & meetups",
      "Workshops & creator sessions",
      "Hackathons & competitions",
      "VIP networking experiences",
      "Direct tutor access",
      "Career opportunity access",
      "Premium community badge",
      "Early feature access",
      "Exclusive merchandise drops",
      "Live mentorship experiences",
      "Future talent placement access"
    ],
    copy: "Go beyond online learning with real-world access, elite networking, and premium growth opportunities.",
    color: "#F59E0B",
    icon: "award"
  }
];

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

const CLUB_LEVELS = SUBSCRIPTION_PLANS.map(p => ({
  number: p.level,
  name: p.name,
  emoji: p.id === "learn" ? "🌱" : p.id === "network" ? "🚀" : "💎",
  color: p.color,
  upgradePriceKobo: p.monthlyPriceKobo,
  perks: p.features,
  isAmbassador: p.id === "irl"
}));

function computeClubLevel(referrals: number, bootcampsCompleted: number): number {
  let level = 1;
  for (const tier of CLUB_LEVELS) {
    if (referrals >= tier.referrals && bootcampsCompleted >= tier.bootcamps) {
      level = tier.number;
    }
  }
  return level;
}

export default function ClubLevelsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const [upgradingLevel, setUpgradingLevel] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: walletRaw, isLoading: walletLoading } = useQuery(getGetWalletQueryOptions());
  const wallet = walletRaw as (typeof walletRaw & { purchasedLevel?: number }) | undefined;

  const organicLevel = computeClubLevel(
    (user as any)?.referralCount ?? 0,
    (user as any)?.bootcampsCompleted ?? 0,
  );
  const purchasedLevel = wallet?.purchasedLevel ?? 1;
  const currentLevel = Math.max(organicLevel, purchasedLevel);
  const currentTier = CLUB_LEVELS.find((l) => l.number === currentLevel) ?? CLUB_LEVELS[0]!;
  const fundsBalance = wallet?.fundsBalance ?? 0;

  async function handleUpgrade(targetLevel: number) {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.level === targetLevel);
    if (!plan) return;

    const priceKobo = billingCycle === "monthly" ? plan.monthlyPriceKobo : plan.yearlyPriceKobo;
    const hasEnough = fundsBalance >= priceKobo;

    if (!hasEnough) {
      const needed = priceKobo - fundsBalance;
      showToast({
        type: "warning",
        title: "Insufficient Funds",
        message: `You need ${formatNaira(needed)} more for the ${billingCycle} plan. Add funds in your Wallet first.`,
        duration: 4000,
      });
      return;
    }

    Alert.alert(
      `Upgrade to ${plan.name}?`,
      `${formatNaira(priceKobo)} will be deducted from your cash balance to unlock ${plan.name} (${billingCycle}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Pay ${formatNaira(priceKobo)}`,
          style: "default",
          onPress: async () => {
            setUpgradingLevel(targetLevel);
            try {
              const domain = process.env["EXPO_PUBLIC_DOMAIN"];
              const baseUrl = domain ? `https://${domain}` : "";
              const res = await fetch(`${baseUrl}/api/wallet/upgrade-level`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token ?? ""}`,
                },
                body: JSON.stringify({ 
                  targetLevel,
                  billingCycle, // Pass the cycle to the backend
                  amountKobo: priceKobo
                }),
              });
              const data = await res.json() as { ok?: boolean; message?: string; error?: string };
              if (!res.ok) {
                showToast({ type: "error", title: "Upgrade failed", message: data.message ?? "Please try again." });
              } else {
                await qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
                showToast({
                  type: "success",
                  title: `🎉 ${plan.name} Unlocked!`,
                  message: `Welcome to the club! Your ${billingCycle} subscription is now active.`,
                  duration: 5000,
                });
                router.back();
              }
            } catch {
              showToast({ type: "error", title: "Network error", message: "Please check your connection." });
            } finally {
              setUpgradingLevel(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Zero Club Subscription</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Level up your digital building journey
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Billing Toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            onPress={() => setBillingCycle("monthly")}
            style={[styles.toggleBtn, billingCycle === "monthly" && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.toggleText, { color: billingCycle === "monthly" ? "#fff" : colors.mutedForeground }]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setBillingCycle("yearly")}
            style={[styles.toggleBtn, billingCycle === "yearly" && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.toggleText, { color: billingCycle === "yearly" ? "#fff" : colors.mutedForeground }]}>Yearly</Text>
          </TouchableOpacity>
        </View>

        {SUBSCRIPTION_PLANS.map((plan) => {
          const priceKobo = billingCycle === "monthly" ? plan.monthlyPriceKobo : plan.yearlyPriceKobo;
          const isUpgrading = upgradingLevel === plan.level;
          const canAfford = fundsBalance >= priceKobo;
          
          return (
            <View 
              key={plan.id} 
              style={[styles.planCard, { backgroundColor: colors.card, borderColor: plan.color + "40" }]}
            >
              <View style={[styles.planHeader, { backgroundColor: plan.color + "15" }]}>
                <View style={[styles.planIconWrap, { backgroundColor: plan.color }]}>
                  <Feather name={plan.icon as any} size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, { color: colors.foreground }]}>
                    {formatNaira(priceKobo)}
                    <Text style={{ fontSize: 14, fontWeight: "400", color: colors.mutedForeground }}>
                      /{billingCycle === "monthly" ? "month" : "year"}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.planBody}>
                <View style={styles.bestForBox}>
                  <Text style={[styles.bestForLabel, { color: colors.mutedForeground }]}>Best for:</Text>
                  <Text style={[styles.bestForText, { color: colors.foreground }]}>{plan.bestFor}</Text>
                </View>

                <View style={styles.perksSection}>
                  <Text style={[styles.perksTitle, { color: colors.foreground }]}>
                    {plan.plusPrefix || "What Users Get"}
                  </Text>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.perkRow}>
                      <Feather name="check-circle" size={14} color={plan.color} />
                      <Text style={[styles.perkText, { color: colors.foreground }]}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.copyBox, { backgroundColor: plan.color + "08" }]}>
                  <Text style={[styles.copyText, { color: colors.mutedForeground }]}>{plan.copy}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.upgradeBtn,
                    { backgroundColor: plan.color, opacity: isUpgrading ? 0.7 : 1 }
                  ]}
                  onPress={() => handleUpgrade(plan.level)}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.upgradeBtnText}>
                        Upgrade to {plan.id.toUpperCase()}
                      </Text>
                      <Feather name="arrow-right" size={16} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                {!canAfford && (
                  <Text style={[styles.needMoreText, { color: colors.mutedForeground }]}>
                    Need {formatNaira(priceKobo - fundsBalance)} more in your wallet
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
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
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, marginTop: 1 },
  content: { padding: 16, gap: 16 },

  toggleContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
  },

  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  planIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  planName: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
  },
  planBody: {
    padding: 20,
    gap: 20,
  },
  bestForBox: {
    gap: 4,
  },
  bestForLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  bestForText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  perksSection: {
    gap: 12,
  },
  perksTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  perkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  copyBox: {
    padding: 14,
    borderRadius: 12,
  },
  copyText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
    textAlign: "center",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  needMoreText: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
});
