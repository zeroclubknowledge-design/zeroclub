import React, { useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getGetWalletQueryOptions,
  getListXpEventsQueryOptions,
  getListBankAccountsQueryOptions,
  getListWithdrawalsQueryOptions,
  useCreateWithdrawal,
  getGetWalletQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { XpEvent, BankAccount } from "@workspace/api-client-react";

const SOURCE_LABELS: Record<string, string> = {
  build_posted: "Build Posted",
  proof_project: "Proof Project",
  bootcamp_module: "Module Complete",
  bootcamp_completed: "Bootcamp Done",
  referral_bonus: "Referral Bonus",
  build_milestone: "Build Milestone Bonus",
};

const SOURCE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  build_posted: "edit-3",
  proof_project: "zap",
  bootcamp_module: "book",
  bootcamp_completed: "award",
  referral_bonus: "users",
  build_milestone: "star",
};

const SOURCE_COLORS: Record<string, string> = {
  build_posted: "#6366F1",
  proof_project: "#F59E0B",
  bootcamp_module: "#6366F1",
  bootcamp_completed: "#10B981",
  referral_bonus: "#8B5CF6",
  build_milestone: "#F59E0B",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(events: XpEvent[]): { title: string; data: XpEvent[] }[] {
  const map = new Map<string, XpEvent[]>();
  for (const e of events) {
    const key = formatDate(e.createdAt as string);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

const PRESET_AMOUNTS = [
  { label: "₦1,000", kobo: 100_000 },
  { label: "₦5,000", kobo: 500_000 },
  { label: "₦10,000", kobo: 1_000_000 },
  { label: "₦50,000", kobo: 5_000_000 },
];

type ActiveTab = "activity" | "stats";

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const { isDesktop } = useBreakpoint();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 0 : 16) : insets.top;
  const bottomPadding = Platform.OS === "web" ? 0 : insets.bottom;

  const [activeTab, setActiveTab] = useState<ActiveTab>("activity");
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [withdrawXp, setWithdrawXp] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery(getGetWalletQueryOptions());
  const { data: events } = useQuery(getListXpEventsQueryOptions());
  const { data: bankAccounts } = useQuery(getListBankAccountsQueryOptions());
  const { data: withdrawals } = useQuery(getListWithdrawalsQueryOptions());

  const { showToast } = useToast();
  const createWithdrawal = useCreateWithdrawal();

  const minXp = wallet?.minWithdrawalXp ?? 2000;
  const canWithdraw = wallet ? wallet.xpBalance >= minXp : false;

  const xpProgress =
    wallet && wallet.totalXpForNextLevel !== wallet.xpForCurrentLevel
      ? Math.max(
          0,
          Math.min(
            100,
            ((wallet.xpBalance - wallet.xpForCurrentLevel) /
              (wallet.totalXpForNextLevel - wallet.xpForCurrentLevel)) *
              100,
          ),
        )
      : 0;

  const handleWithdrawSubmit = () => {
    const xp = parseInt(withdrawXp, 10);
    if (!selectedAccount) {
      showToast({ type: "warning", title: "Select account", message: "Please select a bank account" });
      return;
    }
    if (isNaN(xp) || xp < minXp) {
      showToast({ type: "warning", title: "Invalid amount", message: `Minimum withdrawal is ${minXp} XP` });
      return;
    }
    if (wallet && xp > wallet.xpBalance) {
      showToast({ type: "warning", title: "Insufficient XP", message: "You don't have enough XP" });
      return;
    }
    createWithdrawal.mutate(
      { data: { bankAccountId: selectedAccount.id, amountXp: xp } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          setWithdrawModal(false);
          setWithdrawXp("");
          setSelectedAccount(null);
          showToast({
            type: "success",
            title: "Withdrawal Requested",
            message: `${xp} XP → ${formatNaira(xp * 10)} submitted. Processing takes 1–3 business days.`,
            duration: 5000,
          });
        },
        onError: () => {
          showToast({ type: "error", title: "Withdrawal failed", message: "Please try again." });
        },
      },
    );
  };

  const handleAddFunds = async (kobo: number) => {
    if (!kobo || kobo <= 0) return;
    setAddLoading(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const baseUrl = domain ? `https://${domain}` : "";
      const res = await fetch(`${baseUrl}/api/wallet/add-funds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ amountKobo: kobo }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        showToast({ type: "error", title: "Failed", message: err.message ?? "Could not add funds." });
        return;
      }
      const data = await res.json() as { fundsBalance: number };
      qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      setAddModal(false);
      setAddAmount("");
      showToast({
        type: "success",
        title: "Funds Added",
        message: `${formatNaira(kobo)} added. New balance: ${formatNaira(data.fundsBalance)}`,
        duration: 4000,
      });
    } catch {
      showToast({ type: "error", title: "Network error", message: "Please check your connection." });
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddSubmit = () => {
    const naira = parseFloat(addAmount.replace(/,/g, ""));
    if (isNaN(naira) || naira <= 0) {
      showToast({ type: "warning", title: "Invalid amount", message: "Enter a valid amount in Naira." });
      return;
    }
    void handleAddFunds(Math.round(naira * 100));
  };

  const sections = groupByDate(events ?? []);

  const statsContent = (
    <View style={styles.statsWrap}>
      {/* Level progress */}
      {wallet && (
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statsCardRow}>
            <View style={[styles.levelCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.levelNum}>{wallet.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statsCardTitle, { color: colors.foreground }]}>
                Level {wallet.level} · {user?.displayName ?? "Builder"}
              </Text>
              <Text style={[styles.statsCardSub, { color: colors.mutedForeground }]}>
                {wallet.xpToNextLevel} XP to next level
              </Text>
            </View>
          </View>
          <View style={[styles.progBg, { backgroundColor: colors.muted }]}>
            <View style={[styles.progFill, { backgroundColor: colors.primary, width: `${xpProgress}%` as `${number}%` }]} />
          </View>
        </View>
      )}

      {/* Stat grid */}
      <View style={styles.statGrid}>
        {[
          { label: "Proofs Earned", value: events?.filter((e) => e.source === "proof_project").length ?? 0, icon: "zap" as const, color: colors.xpGold },
          { label: "Bootcamps Done", value: events?.filter((e) => e.source === "bootcamp_completed").length ?? 0, icon: "award" as const, color: "#10B981" },
          { label: "Builds Posted", value: events?.filter((e) => e.source === "build_posted").length ?? 0, icon: "edit-3" as const, color: colors.primary },
          { label: "Withdrawals", value: withdrawals?.length ?? 0, icon: "arrow-up-right" as const, color: "#8B5CF6" },
        ].map((s) => (
          <View key={s.label} style={[styles.statCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statCellIcon, { backgroundColor: s.color + "22" }]}>
              <Feather name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={[styles.statCellValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statCellLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Withdrawal hint */}
      {wallet && !canWithdraw && (
        <View style={[styles.hintRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.hintIconWrap, { backgroundColor: colors.xpGold + "22" }]}>
            <Feather name="info" size={15} color={colors.xpGold} />
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Earn {(minXp - wallet.xpBalance).toLocaleString()} more XP to unlock cash withdrawals (min {minXp.toLocaleString()} XP = {formatNaira(minXp * 10)})
          </Text>
        </View>
      )}
    </View>
  );

  const modals = (
    <>
      {/* ── Add Funds Modal ── */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Funds</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Top up your Zero Wallet cash balance</Text>
            <View style={styles.presetRow}>
              {PRESET_AMOUNTS.map((p) => (
                <TouchableOpacity key={p.kobo} style={[styles.presetBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={() => setAddAmount(String(p.kobo / 100))} activeOpacity={0.8}>
                  <Text style={[styles.presetText, { color: colors.foreground }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Custom amount (₦)</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted }]}>
              <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>₦</Text>
              <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" value={addAmount} onChangeText={setAddAmount} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.muted }]} onPress={() => { setAddModal(false); setAddAmount(""); }}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: addLoading ? colors.muted : "#10B981" }]} onPress={handleAddSubmit} disabled={addLoading}>
                {addLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Add Funds</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Withdraw Modal ── */}
      <Modal visible={withdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Withdraw XP</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>1,000 XP = {formatNaira(10000)} · Min {(wallet?.minWithdrawalXp ?? 2000).toLocaleString()} XP</Text>
            {!canWithdraw && (
              <View style={[styles.warnBox, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B44" }]}>
                <Feather name="alert-triangle" size={14} color="#F59E0B" />
                <Text style={[styles.warnText, { color: "#F59E0B" }]}>You need {(minXp - (wallet?.xpBalance ?? 0)).toLocaleString()} more XP to withdraw.</Text>
              </View>
            )}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>XP to withdraw</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted }]}>
              <Feather name="zap" size={16} color={colors.xpGold} />
              <TextInput style={[styles.input, { color: colors.foreground }]} placeholder={`Min ${wallet?.minWithdrawalXp ?? 2000}`} placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" value={withdrawXp} onChangeText={setWithdrawXp} />
              {withdrawXp && !isNaN(parseInt(withdrawXp, 10)) && (
                <Text style={[styles.convertedAmt, { color: "#10B981" }]}>= {formatNaira(parseInt(withdrawXp, 10) * 10)}</Text>
              )}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bank account</Text>
            {!bankAccounts?.length ? (
              <View style={[styles.noAccountBox, { backgroundColor: colors.muted }]}>
                <Feather name="alert-circle" size={15} color={colors.mutedForeground} />
                <Text style={[styles.noAccountText, { color: colors.mutedForeground }]}>No bank account added. Go to Settings to add one.</Text>
              </View>
            ) : (
              <ScrollView style={styles.accountList} showsVerticalScrollIndicator={false}>
                {bankAccounts.map((acct) => (
                  <TouchableOpacity key={acct.id} style={[styles.accountOption, { backgroundColor: selectedAccount?.id === acct.id ? colors.primary + "22" : colors.muted, borderColor: selectedAccount?.id === acct.id ? colors.primary : colors.border }]} onPress={() => setSelectedAccount(acct)} activeOpacity={0.8}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountBank, { color: colors.foreground }]}>{acct.bankName}</Text>
                      <Text style={[styles.accountDetail, { color: colors.mutedForeground }]}>{acct.accountNumber} · {acct.accountName}</Text>
                    </View>
                    {selectedAccount?.id === acct.id && <Feather name="check-circle" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.muted }]} onPress={() => setWithdrawModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: createWithdrawal.isPending ? colors.muted : colors.primary }]} onPress={handleWithdrawSubmit} disabled={createWithdrawal.isPending}>
                {createWithdrawal.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Request Withdrawal</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  const activityList = (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 100 }]}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        canWithdraw ? (
          <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.primary + "50" }]} onPress={() => setWithdrawModal(true)} activeOpacity={0.85}>
            <View style={[styles.featureCardIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="arrow-up-right" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureCardTitle, { color: colors.foreground }]}>Withdraw Your XP</Text>
              <Text style={[styles.featureCardSub, { color: colors.mutedForeground }]}>Convert {wallet?.xpBalance.toLocaleString()} XP → {formatNaira((wallet?.xpBalance ?? 0) * 10)}. Arrives in 1–3 days.</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="zap" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Complete modules, post builds, or earn referral bonuses to see your XP history here.</Text>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionDate, { color: colors.mutedForeground }]}>{section.title}</Text>
      )}
      renderItem={({ item }: { item: XpEvent }) => {
        const icon = SOURCE_ICONS[item.source] ?? "zap";
        const iconColor = SOURCE_COLORS[item.source] ?? colors.primary;
        return (
          <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.txIcon, { backgroundColor: iconColor + "20" }]}>
              <Feather name={icon} size={15} color={iconColor} />
            </View>
            <View style={styles.txInfo}>
              <Text style={[styles.txLabel, { color: colors.foreground }]}>{SOURCE_LABELS[item.source] ?? item.source}</Text>
              {item.detail && <Text style={[styles.txDetail, { color: colors.mutedForeground }]} numberOfLines={1}>{item.detail}</Text>}
            </View>
            {item.amount > 0 && <Text style={[styles.txAmount, { color: colors.xpGold }]}>+{item.amount} XP</Text>}
          </View>
        );
      }}
    />
  );

  // ── Desktop Layout ──
  if (isDesktop) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Desktop top bar with hero info inline */}
        <LinearGradient
          colors={["#4F52D3", "#6366F1", "#818CF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.desktopHero}
        >
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.desktopHeroLeft}>
            <Text style={styles.heroLabel}>Zero Wallet</Text>
            <Text style={styles.desktopHeroBalance}>
              {walletLoading ? "—" : (wallet?.xpBalance ?? 0).toLocaleString()}
              <Text style={styles.desktopHeroUnit}> XP</Text>
            </Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Feather name="zap" size={11} color="#6366F1" />
                <Text style={styles.heroBadgeText}>{canWithdraw ? "Withdrawals Unlocked" : `${minXp.toLocaleString()} XP to withdraw`}</Text>
              </View>
              <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                <Feather name="credit-card" size={11} color="#fff" />
                <Text style={[styles.heroBadgeText, { color: "#fff" }]}>{walletLoading ? "—" : formatNaira(wallet?.fundsBalance ?? 0)} Cash</Text>
              </View>
            </View>
          </View>
          <View style={styles.desktopHeroActions}>
            <TouchableOpacity style={[styles.desktopActionBtn, { backgroundColor: "#fff" }]} onPress={() => setAddModal(true)} activeOpacity={0.85}>
              <Feather name="plus" size={15} color="#6366F1" />
              <Text style={[styles.desktopActionText, { color: "#6366F1" }]}>Add Funds</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.desktopActionBtn, { backgroundColor: canWithdraw ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)", opacity: canWithdraw ? 1 : 0.6 }]}
              onPress={() => setWithdrawModal(true)}
              activeOpacity={canWithdraw ? 0.85 : 0.5}
            >
              <Feather name="arrow-up-right" size={15} color="#fff" />
              <Text style={[styles.desktopActionText, { color: "#fff" }]}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Desktop body: activity + stats side by side */}
        <View style={styles.desktopBody}>
          {/* Activity column */}
          <View style={styles.desktopActivityCol}>
            <View style={[styles.desktopColHeader2, { borderBottomColor: colors.border }]}>
              <Text style={[styles.desktopColTitle, { color: colors.foreground }]}>XP Activity</Text>
              <Text style={[styles.desktopColSub, { color: colors.mutedForeground }]}>Your earn history</Text>
            </View>
            {activityList}
          </View>

          {/* Stats column */}
          <View style={[styles.desktopStatsCol, { borderLeftColor: colors.border }]}>
            <View style={[styles.desktopColHeader2, { borderBottomColor: colors.border }]}>
              <Text style={[styles.desktopColTitle, { color: colors.foreground }]}>Stats</Text>
              <Text style={[styles.desktopColSub, { color: colors.mutedForeground }]}>Your progress</Text>
            </View>
            <ScrollView contentContainerStyle={[styles.statsScroll, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
              {statsContent}
            </ScrollView>
          </View>
        </View>
        {modals}
      </View>
    );
  }

  // ── Mobile Layout ──
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Hero Card ── */}
      <LinearGradient
        colors={["#4F52D3", "#6366F1", "#818CF8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPadding + 14 }]}
      >
        {/* Decorative circles */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />

        <Text style={styles.heroLabel}>Zero Wallet</Text>
        <Text style={styles.heroBalance}>
          {walletLoading ? "—" : (wallet?.xpBalance ?? 0).toLocaleString()}
        </Text>
        <Text style={styles.heroUnit}>Zero Points (XP)</Text>

        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Feather name="zap" size={11} color="#6366F1" />
            <Text style={styles.heroBadgeText}>
              {canWithdraw ? "Withdrawals Unlocked" : `${minXp.toLocaleString()} XP to withdraw`}
            </Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            <Feather name="credit-card" size={11} color="#fff" />
            <Text style={[styles.heroBadgeText, { color: "#fff" }]}>
              {walletLoading ? "—" : formatNaira(wallet?.fundsBalance ?? 0)} Cash
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Action Toggle ── */}
      <View style={[styles.actionToggleWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.actionToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionToggleBtn, styles.actionToggleBtnActive]}
            onPress={() => setAddModal(true)}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.actionToggleBtnActiveText}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionToggleBtn,
              canWithdraw ? styles.actionToggleBtnSecondary : styles.actionToggleBtnDisabled,
            ]}
            onPress={() => setWithdrawModal(true)}
            activeOpacity={canWithdraw ? 0.85 : 0.5}
          >
            <Feather name="arrow-up-right" size={14} color={canWithdraw ? colors.foreground : colors.mutedForeground} />
            <Text style={[styles.actionToggleBtnText, { color: canWithdraw ? colors.foreground : colors.mutedForeground }]}>
              Withdraw
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab Switcher ── */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(["activity", "stats"] as ActiveTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === t ? colors.primary : colors.mutedForeground },
              ]}
            >
              {t === "activity" ? "Activity" : "Stats"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      {activeTab === "stats" ? (
        <ScrollView contentContainerStyle={[styles.statsScroll, { paddingBottom: bottomPadding + 100 }]} showsVerticalScrollIndicator={false}>
          {statsContent}
        </ScrollView>
      ) : activityList}
      {modals}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Desktop
  desktopHero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 28,
    overflow: "hidden",
    gap: 24,
  },
  desktopHeroLeft: { flex: 1, gap: 6 },
  desktopHeroBalance: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  desktopHeroUnit: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 22,
    fontWeight: "400",
  },
  desktopHeroActions: { flexDirection: "row", gap: 10, flexShrink: 0 },
  desktopActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  desktopActionText: { fontSize: 14, fontWeight: "700" },
  desktopBody: { flex: 1, flexDirection: "row" },
  desktopActivityCol: { flex: 1 },
  desktopStatsCol: { width: 340, borderLeftWidth: 1 },
  desktopColHeader2: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  desktopColTitle: { fontSize: 16, fontWeight: "700" },
  desktopColSub: { fontSize: 12, marginTop: 2 },

  // Hero (mobile)
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: "hidden",
  },
  deco1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -60,
    right: -60,
  },
  deco2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -40,
    left: -30,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroBalance: {
    color: "#fff",
    fontSize: 52,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  heroUnit: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 16,
    marginTop: 2,
  },
  heroBadgeRow: { flexDirection: "row", gap: 8 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 11, fontWeight: "700", color: "#6366F1" },

  // Action toggle
  actionToggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  actionToggle: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  actionToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
  },
  actionToggleBtnActive: {
    backgroundColor: "#6366F1",
  },
  actionToggleBtnSecondary: {
    backgroundColor: "transparent",
  },
  actionToggleBtnDisabled: {
    backgroundColor: "transparent",
    opacity: 0.45,
  },
  actionToggleBtnActiveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  actionToggleBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 24,
  },
  tabBtnText: { fontSize: 14, fontWeight: "600" },

  // Activity list
  listContent: { paddingTop: 8, paddingHorizontal: 16 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: 4,
  },
  featureCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCardTitle: { fontSize: 14, fontWeight: "700" },
  featureCardSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  sectionDate: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 6,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1, gap: 2 },
  txLabel: { fontSize: 14, fontWeight: "600" },
  txDetail: { fontSize: 12 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },

  // Stats tab
  statsScroll: { paddingHorizontal: 16, paddingTop: 12 },
  statsWrap: { gap: 12 },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statsCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statsCardTitle: { fontSize: 14, fontWeight: "700" },
  statsCardSub: { fontSize: 12, marginTop: 2 },
  levelCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNum: { color: "#fff", fontSize: 18, fontWeight: "800" },
  progBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%" as `${number}%`, borderRadius: 3 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCell: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  statCellIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statCellValue: { fontSize: 22, fontWeight: "800" },
  statCellLabel: { fontSize: 11 },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  hintIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 44,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSub: { fontSize: 13, marginTop: -6 },
  warnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  warnText: { flex: 1, fontSize: 13, fontWeight: "500" },
  presetRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  presetText: { fontSize: 13, fontWeight: "600" },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: -4 },
  currencySymbol: { fontSize: 16, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 16, fontWeight: "600" },
  convertedAmt: { fontSize: 13, fontWeight: "700" },
  noAccountBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  noAccountText: { flex: 1, fontSize: 13 },
  accountList: { maxHeight: 160 },
  accountOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  accountBank: { fontSize: 14, fontWeight: "600" },
  accountDetail: { fontSize: 12, marginTop: 2 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalSubmitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
