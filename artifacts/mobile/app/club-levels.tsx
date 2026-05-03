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

interface ClubLevel {
  number: number;
  name: string;
  emoji: string;
  color: string;
  referrals: number;
  bootcamps: number;
  isAmbassador: boolean;
  ambassadorTitle?: string;
  monthlyStipend?: string;
  upgradePriceKobo: number;
  perks: string[];
}

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

const CLUB_LEVELS: ClubLevel[] = [
  {
    number: 1,
    name: "Zero",
    emoji: "🌱",
    color: "#6B7280",
    referrals: 0,
    bootcamps: 0,
    isAmbassador: false,
    upgradePriceKobo: 0,
    perks: ["Access to community feed", "Join club channels", "Earn Zero Points"],
  },
  {
    number: 2,
    name: "Spark",
    emoji: "✨",
    color: "#06B6D4",
    referrals: 1,
    bootcamps: 1,
    isAmbassador: false,
    upgradePriceKobo: 50_000,
    perks: ["Unlock bootcamp channels", "Show & Tell access", "Profile level badge"],
  },
  {
    number: 3,
    name: "Builder",
    emoji: "🔨",
    color: "#3B82F6",
    referrals: 3,
    bootcamps: 2,
    isAmbassador: false,
    upgradePriceKobo: 120_000,
    perks: ["Priority post visibility", "Builder badge on profile", "Access to resources channels"],
  },
  {
    number: 4,
    name: "Maker",
    emoji: "⚙️",
    color: "#6366F1",
    referrals: 5,
    bootcamps: 3,
    isAmbassador: false,
    upgradePriceKobo: 250_000,
    perks: ["Maker badge", "XP bonus on proof posts", "Early bootcamp access"],
  },
  {
    number: 5,
    name: "Creator",
    emoji: "🎨",
    color: "#8B5CF6",
    referrals: 8,
    bootcamps: 5,
    isAmbassador: false,
    upgradePriceKobo: 500_000,
    perks: ["Creator badge", "Featured in club spotlight", "XP multiplier (1.1×)"],
  },
  {
    number: 6,
    name: "Innovator",
    emoji: "💡",
    color: "#A855F7",
    referrals: 12,
    bootcamps: 7,
    isAmbassador: false,
    upgradePriceKobo: 900_000,
    perks: ["Innovator badge", "Invite-only sessions", "XP multiplier (1.2×)"],
  },
  {
    number: 7,
    name: "Pioneer",
    emoji: "🚀",
    color: "#EC4899",
    referrals: 18,
    bootcamps: 10,
    isAmbassador: false,
    upgradePriceKobo: 1_500_000,
    perks: ["Pioneer badge", "Beta feature access", "Mentorship circle access"],
  },
  {
    number: 8,
    name: "Champion",
    emoji: "🥉",
    color: "#CD7F32",
    referrals: 25,
    bootcamps: 13,
    isAmbassador: true,
    ambassadorTitle: "Bronze Ambassador",
    monthlyStipend: "₦15,000",
    upgradePriceKobo: 2_500_000,
    perks: ["Monthly ₦15,000 stipend", "Ambassador badge", "Official Zero Club merch", "Monthly ambassador calls"],
  },
  {
    number: 9,
    name: "Leader",
    emoji: "🥈",
    color: "#9CA3AF",
    referrals: 35,
    bootcamps: 17,
    isAmbassador: true,
    ambassadorTitle: "Silver Ambassador",
    monthlyStipend: "₦30,000",
    upgradePriceKobo: 4_000_000,
    perks: ["Monthly ₦30,000 stipend", "Silver Ambassador badge", "Priority support access", "Featured ambassador profile"],
  },
  {
    number: 10,
    name: "Mentor",
    emoji: "🥇",
    color: "#F59E0B",
    referrals: 50,
    bootcamps: 22,
    isAmbassador: true,
    ambassadorTitle: "Gold Ambassador",
    monthlyStipend: "₦60,000",
    upgradePriceKobo: 6_500_000,
    perks: ["Monthly ₦60,000 stipend", "Gold Ambassador badge", "Bootcamp co-host rights", "Revenue share bonus"],
  },
  {
    number: 11,
    name: "Legend",
    emoji: "💠",
    color: "#BAC8FF",
    referrals: 70,
    bootcamps: 28,
    isAmbassador: true,
    ambassadorTitle: "Platinum Ambassador",
    monthlyStipend: "₦100,000",
    upgradePriceKobo: 10_000_000,
    perks: ["Monthly ₦100,000 stipend", "Platinum badge", "Community equity access", "Exclusive retreats & events"],
  },
  {
    number: 12,
    name: "Icon",
    emoji: "💎",
    color: "#67E8F9",
    referrals: 100,
    bootcamps: 35,
    isAmbassador: true,
    ambassadorTitle: "Diamond Ambassador",
    monthlyStipend: "₦150,000",
    upgradePriceKobo: 16_000_000,
    perks: ["Monthly ₦150,000 stipend", "Diamond badge", "Board advisory seat", "Product input rights"],
  },
  {
    number: 13,
    name: "Titan",
    emoji: "🏆",
    color: "#34D399",
    referrals: 150,
    bootcamps: 45,
    isAmbassador: true,
    ambassadorTitle: "Elite Ambassador",
    monthlyStipend: "₦250,000",
    upgradePriceKobo: 25_000_000,
    perks: ["Monthly ₦250,000 stipend", "Elite badge", "Zero Club equity options", "Annual retreat (all-expenses)"],
  },
  {
    number: 14,
    name: "Visionary",
    emoji: "👁️",
    color: "#F43F5E",
    referrals: 200,
    bootcamps: 55,
    isAmbassador: true,
    ambassadorTitle: "Master Ambassador",
    monthlyStipend: "₦400,000",
    upgradePriceKobo: 40_000_000,
    perks: ["Monthly ₦400,000 stipend", "Master badge", "Co-founder advisory role", "Revenue profit share (1%)"],
  },
  {
    number: 15,
    name: "Zero Elite",
    emoji: "⚡",
    color: "#D4387C",
    referrals: 300,
    bootcamps: 70,
    isAmbassador: true,
    ambassadorTitle: "Grand Ambassador",
    monthlyStipend: "₦700,000",
    upgradePriceKobo: 70_000_000,
    perks: ["Monthly ₦700,000 stipend", "Grand Ambassador badge", "Full equity stake", "Lifetime club membership", "Own Zero Club chapter"],
  },
];

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
    const tier = CLUB_LEVELS.find((t) => t.number === targetLevel);
    if (!tier) return;

    const hasEnough = fundsBalance >= tier.upgradePriceKobo;
    if (!hasEnough) {
      const needed = tier.upgradePriceKobo - fundsBalance;
      showToast({
        type: "warning",
        title: "Insufficient Funds",
        message: `You need ${formatNaira(needed)} more. Add funds in your Wallet first.`,
        duration: 4000,
      });
      return;
    }

    Alert.alert(
      `Upgrade to ${tier.name}?`,
      `${formatNaira(tier.upgradePriceKobo)} will be deducted from your cash balance to unlock Level ${targetLevel} (${tier.name}).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Pay ${formatNaira(tier.upgradePriceKobo)}`,
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
                body: JSON.stringify({ targetLevel }),
              });
              const data = await res.json() as { ok?: boolean; message?: string; error?: string };
              if (!res.ok) {
                showToast({ type: "error", title: "Upgrade failed", message: data.message ?? "Please try again." });
              } else {
                await qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
                showToast({
                  type: "success",
                  title: `🎉 Level ${targetLevel} Unlocked!`,
                  message: `Welcome to ${tier.name}! You've upgraded your Zero Club rank.`,
                  duration: 5000,
                });
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Zero Club Levels</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Your journey to the top
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current level hero */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: currentTier.color + "18", borderColor: currentTier.color + "60" },
          ]}
        >
          <Text style={styles.heroEmoji}>{currentTier.emoji}</Text>
          <Text style={[styles.heroLevelName, { color: currentTier.color }]}>{currentTier.name}</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Level {currentTier.number} · Your current rank
          </Text>
          {currentTier.isAmbassador && (
            <View style={[styles.ambassadorBanner, { backgroundColor: currentTier.color }]}>
              <Feather name="star" size={12} color="#fff" />
              <Text style={styles.ambassadorBannerText}>{currentTier.ambassadorTitle}</Text>
              <Text style={styles.ambassadorStipend}>{currentTier.monthlyStipend}/mo</Text>
            </View>
          )}
          {purchasedLevel > organicLevel && purchasedLevel === currentLevel && (
            <View style={[styles.purchasedBadge, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B50" }]}>
              <Feather name="credit-card" size={11} color="#F59E0B" />
              <Text style={[styles.purchasedBadgeText, { color: "#F59E0B" }]}>Unlocked with funds</Text>
            </View>
          )}
        </View>

        {/* Cash balance + how to upgrade */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>How levels work</Text>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: "#8B5CF620" }]}>
              <Feather name="users" size={14} color="#8B5CF6" />
            </View>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Refer students to Zero Club to unlock higher levels organically
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: "#F59E0B20" }]}>
              <Feather name="book" size={14} color="#F59E0B" />
            </View>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Complete bootcamps to meet level requirements
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: "#10B98120" }]}>
              <Feather name="credit-card" size={14} color="#10B981" />
            </View>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Or pay with your cash balance to skip requirements instantly
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast, { backgroundColor: "#F59E0B12", borderColor: "#F59E0B40" }]}>
            <View style={[styles.infoIcon, { backgroundColor: "#F59E0B25" }]}>
              <Feather name="refresh-cw" size={14} color="#F59E0B" />
            </View>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              <Text style={{ color: "#F59E0B", fontWeight: "700" }}>Monthly requirement: </Text>
              Ambassadors must refer the same number of new students every month to keep collecting their stipend.
            </Text>
          </View>
        </View>

        {/* Cash balance chip */}
        {!walletLoading && (
          <View style={[styles.balanceChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.balanceIcon, { backgroundColor: "#10B98120" }]}>
              <Feather name="dollar-sign" size={14} color="#10B981" />
            </View>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Cash balance available for upgrades:</Text>
            <Text style={[styles.balanceAmount, { color: "#10B981" }]}>{formatNaira(fundsBalance)}</Text>
          </View>
        )}

        {/* Level cards */}
        {CLUB_LEVELS.map((tier) => {
          const isCurrentLevel = tier.number === currentLevel;
          const isUnlocked = tier.number <= currentLevel;
          const isNext = tier.number === currentLevel + 1;
          const isPurchasedUnlock = tier.number <= purchasedLevel && tier.number > organicLevel;
          const canAfford = fundsBalance >= tier.upgradePriceKobo;
          const isUpgrading = upgradingLevel === tier.number;

          return (
            <View
              key={tier.number}
              style={[
                styles.tierCard,
                {
                  backgroundColor: isUnlocked ? tier.color + "12" : colors.card,
                  borderColor: isCurrentLevel ? tier.color : isUnlocked ? tier.color + "50" : colors.border,
                  borderWidth: isCurrentLevel ? 2 : 1,
                },
              ]}
            >
              {/* Ambassador header band */}
              {tier.isAmbassador && (
                <View style={[styles.ambassadorBand, { backgroundColor: tier.color + "22" }]}>
                  <View style={styles.ambassadorBandLeft}>
                    <View style={styles.ambassadorBandTop}>
                      <Feather name="star" size={11} color={tier.color} />
                      <Text style={[styles.ambassadorBandText, { color: tier.color }]}>
                        {tier.ambassadorTitle}
                      </Text>
                      <View style={styles.ambassadorBandSpacer} />
                      <Text style={[styles.ambassadorBandStipend, { color: tier.color }]}>
                        {tier.monthlyStipend}/month
                      </Text>
                    </View>
                    <View style={styles.ambassadorBandBottom}>
                      <Feather name="refresh-cw" size={10} color={tier.color + "BB"} />
                      <Text style={[styles.ambassadorBandNote, { color: tier.color + "BB" }]}>
                        Refer {tier.referrals} new students/month to keep stipend
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.tierHeader}>
                <View style={styles.tierLeft}>
                  <View style={[styles.emojiCircle, { backgroundColor: isUnlocked ? tier.color + "25" : colors.muted }]}>
                    <Text style={styles.tierEmoji}>{isUnlocked ? tier.emoji : "🔒"}</Text>
                  </View>
                  <View>
                    <View style={styles.tierNameRow}>
                      <Text style={[styles.tierName, { color: isUnlocked ? tier.color : colors.mutedForeground }]}>
                        {tier.name}
                      </Text>
                      {isCurrentLevel && (
                        <View style={[styles.currentBadge, { backgroundColor: tier.color }]}>
                          <Text style={styles.currentBadgeText}>YOU</Text>
                        </View>
                      )}
                      {isNext && (
                        <View style={[styles.nextBadge, { borderColor: tier.color }]}>
                          <Text style={[styles.nextBadgeText, { color: tier.color }]}>NEXT</Text>
                        </View>
                      )}
                      {isPurchasedUnlock && (
                        <View style={[styles.paidBadge]}>
                          <Feather name="credit-card" size={8} color="#F59E0B" />
                          <Text style={styles.paidBadgeText}>PAID</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.tierLevel, { color: colors.mutedForeground }]}>Level {tier.number}</Text>
                  </View>
                </View>

                {/* Upgrade price badge (for locked levels) */}
                {!isUnlocked && tier.upgradePriceKobo > 0 && (
                  <View style={[styles.priceBadge, { backgroundColor: canAfford ? "#10B98120" : colors.muted, borderColor: canAfford ? "#10B98150" : colors.border }]}>
                    <Feather name="credit-card" size={11} color={canAfford ? "#10B981" : colors.mutedForeground} />
                    <Text style={[styles.priceBadgeText, { color: canAfford ? "#10B981" : colors.mutedForeground }]}>
                      {formatNaira(tier.upgradePriceKobo)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Requirements */}
              <View style={styles.requirementsRow}>
                <View style={[styles.requirementPill, { backgroundColor: isUnlocked ? "#8B5CF620" : colors.muted }]}>
                  <Feather name="users" size={12} color={isUnlocked ? "#8B5CF6" : colors.mutedForeground} />
                  <Text style={[styles.requirementText, { color: isUnlocked ? "#8B5CF6" : colors.mutedForeground }]}>
                    {tier.referrals === 0 ? "No referrals" : `${tier.referrals} referrals`}
                  </Text>
                </View>
                <View style={[styles.requirementPill, { backgroundColor: isUnlocked ? "#F59E0B20" : colors.muted }]}>
                  <Feather name="book" size={12} color={isUnlocked ? "#F59E0B" : colors.mutedForeground} />
                  <Text style={[styles.requirementText, { color: isUnlocked ? "#F59E0B" : colors.mutedForeground }]}>
                    {tier.bootcamps === 0 ? "No bootcamps" : `${tier.bootcamps} bootcamps`}
                  </Text>
                </View>
              </View>

              {/* Perks */}
              <View style={styles.perksSection}>
                {tier.perks.map((perk) => (
                  <View key={perk} style={styles.perkRow}>
                    <Feather
                      name={isUnlocked ? "check-circle" : "circle"}
                      size={13}
                      color={isUnlocked ? tier.color : colors.mutedForeground}
                    />
                    <Text style={[styles.perkText, { color: isUnlocked ? colors.foreground : colors.mutedForeground }]}>
                      {perk}
                    </Text>
                  </View>
                ))}
              </View>

              {/* CTAs */}
              {isNext && (
                <View style={styles.ctaGroup}>
                  <TouchableOpacity
                    style={[styles.ctaBtn, { backgroundColor: tier.color }]}
                    onPress={() => router.push("/referral" as never)}
                    activeOpacity={0.85}
                  >
                    <Feather name="user-plus" size={14} color="#fff" />
                    <Text style={styles.ctaBtnText}>Refer students to unlock</Text>
                    <Feather name="arrow-right" size={14} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.ctaBtnOutline,
                      {
                        borderColor: canAfford ? "#10B981" : colors.border,
                        backgroundColor: canAfford ? "#10B98115" : colors.muted,
                        opacity: isUpgrading ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => handleUpgrade(tier.number)}
                    disabled={isUpgrading}
                    activeOpacity={0.85}
                  >
                    {isUpgrading ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <>
                        <Feather name="credit-card" size={14} color={canAfford ? "#10B981" : colors.mutedForeground} />
                        <Text style={[styles.ctaBtnOutlineText, { color: canAfford ? "#10B981" : colors.mutedForeground }]}>
                          Upgrade with {formatNaira(tier.upgradePriceKobo)}
                        </Text>
                        {!canAfford && (
                          <Text style={[styles.ctaNeedMore, { color: colors.mutedForeground }]}>
                            (need {formatNaira(tier.upgradePriceKobo - fundsBalance)} more)
                          </Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* For non-next locked levels — just show upgrade price button */}
              {!isUnlocked && !isNext && tier.upgradePriceKobo > 0 && (
                <View style={styles.ctaGroup}>
                  <TouchableOpacity
                    style={[
                      styles.ctaBtnOutline,
                      {
                        borderColor: canAfford ? "#10B981" : colors.border,
                        backgroundColor: canAfford ? "#10B98115" : colors.muted,
                        opacity: isUpgrading ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => handleUpgrade(tier.number)}
                    disabled={isUpgrading}
                    activeOpacity={0.85}
                  >
                    {isUpgrading ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <>
                        <Feather name="credit-card" size={14} color={canAfford ? "#10B981" : colors.mutedForeground} />
                        <Text style={[styles.ctaBtnOutlineText, { color: canAfford ? "#10B981" : colors.mutedForeground }]}>
                          Jump to Level {tier.number} · {formatNaira(tier.upgradePriceKobo)}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Bottom motivational note */}
        <View style={[styles.bottomNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.bottomNoteEmoji}>🎯</Text>
          <Text style={[styles.bottomNoteTitle, { color: colors.foreground }]}>Keep climbing!</Text>
          <Text style={[styles.bottomNoteSub, { color: colors.mutedForeground }]}>
            Every referral and bootcamp completion brings you closer to becoming a paid Zero Club Ambassador. Or use your cash balance to skip ahead instantly.
          </Text>
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
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, marginTop: 1 },
  content: { padding: 16, gap: 12 },

  heroCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  heroEmoji: { fontSize: 52, marginBottom: 4 },
  heroLevelName: { fontSize: 28, fontWeight: "900", fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 13, marginTop: 2 },
  ambassadorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  ambassadorBannerText: { color: "#fff", fontSize: 12, fontWeight: "700", flex: 1 },
  ambassadorStipend: { color: "#ffffffCC", fontSize: 12, fontWeight: "800" },
  purchasedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  purchasedBadgeText: { fontSize: 11, fontWeight: "700" },

  infoCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  infoTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoRowLast: { borderRadius: 10, borderWidth: 1, padding: 10 },
  infoIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  balanceIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  balanceLabel: { flex: 1, fontSize: 12, fontWeight: "500" },
  balanceAmount: { fontSize: 15, fontWeight: "800", fontFamily: "Inter_700Bold" },

  tierCard: { borderRadius: 18, overflow: "hidden" },
  ambassadorBand: { paddingHorizontal: 14, paddingVertical: 8 },
  ambassadorBandLeft: { flex: 1, gap: 3 },
  ambassadorBandTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  ambassadorBandBottom: { flexDirection: "row", alignItems: "center", gap: 5 },
  ambassadorBandText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  ambassadorBandSpacer: { flex: 1 },
  ambassadorBandStipend: { fontSize: 12, fontWeight: "900" },
  ambassadorBandNote: { fontSize: 10, fontWeight: "500" },

  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  tierLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  emojiCircle: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tierEmoji: { fontSize: 24 },
  tierNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tierName: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  currentBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  currentBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  nextBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  nextBadgeText: { fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#F59E0B20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  paidBadgeText: { color: "#F59E0B", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  tierLevel: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  priceBadgeText: { fontSize: 12, fontWeight: "700" },

  requirementsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10, flexWrap: "wrap" },
  requirementPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  requirementText: { fontSize: 12, fontWeight: "600" },

  perksSection: { paddingHorizontal: 14, paddingBottom: 14, gap: 7 },
  perkRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  perkText: { fontSize: 13, flex: 1, lineHeight: 18 },

  ctaGroup: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  ctaBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaBtnOutlineText: { fontWeight: "700", fontSize: 13 },
  ctaNeedMore: { fontSize: 11, fontWeight: "500" },

  bottomNote: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  bottomNoteEmoji: { fontSize: 32 },
  bottomNoteTitle: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  bottomNoteSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
