import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { XpEvent, BankAccount } from "@workspace/api-client-react";

const SOURCE_LABELS: Record<string, string> = {
  build_posted: "Build Posted",
  proof_project: "Proof Project",
  bootcamp_module: "Module Complete",
  bootcamp_completed: "Bootcamp Done",
  referral_bonus: "Referral Bonus",
};

const SOURCE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  build_posted: "edit-3",
  proof_project: "zap",
  bootcamp_module: "book",
  bootcamp_completed: "award",
  referral_bonus: "users",
};

function timeAgo(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [withdrawModal, setWithdrawModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [withdrawXp, setWithdrawXp] = useState("");

  const { data: wallet, isLoading: walletLoading } = useQuery(getGetWalletQueryOptions());
  const { data: events, isLoading: eventsLoading } = useQuery(getListXpEventsQueryOptions());
  const { data: bankAccounts } = useQuery(getListBankAccountsQueryOptions());
  const { data: withdrawals } = useQuery(getListWithdrawalsQueryOptions());

  const createWithdrawal = useCreateWithdrawal();

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

  const canWithdraw = wallet && wallet.xpBalance >= (wallet.minWithdrawalXp ?? 2000);
  const minXp = wallet?.minWithdrawalXp ?? 2000;

  const handleWithdrawSubmit = () => {
    const xp = parseInt(withdrawXp, 10);
    if (!selectedAccount) {
      Alert.alert("Select account", "Please select a bank account");
      return;
    }
    if (isNaN(xp) || xp < minXp) {
      Alert.alert("Invalid amount", `Minimum withdrawal is ${minXp} XP`);
      return;
    }
    if (wallet && xp > wallet.xpBalance) {
      Alert.alert("Insufficient XP", "You don't have enough XP");
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
          Alert.alert(
            "Withdrawal Requested",
            `Your request for ${xp} XP → ${formatNaira(xp * 10)} has been submitted. Processing takes 1–3 business days.`,
          );
        },
        onError: () => {
          Alert.alert("Error", "Withdrawal failed. Please try again.");
        },
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 10,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Zero Wallet</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Your points & earnings
          </Text>
        </View>
        {canWithdraw && (
          <TouchableOpacity
            style={[styles.withdrawHeaderBtn, { backgroundColor: colors.primary }]}
            onPress={() => setWithdrawModal(true)}
            activeOpacity={0.85}
          >
            <Feather name="arrow-up-right" size={14} color="#fff" />
            <Text style={styles.withdrawHeaderText}>Withdraw</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={events ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {walletLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
            ) : wallet ? (
              <>
                {/* Balance Cards */}
                <View style={styles.balanceRow}>
                  {/* Zero Points (XP) */}
                  <View style={[styles.balanceCard, { backgroundColor: "#1A1200", borderColor: colors.xpGold + "40" }]}>
                    <View style={[styles.balanceIconWrap, { backgroundColor: colors.xpGold + "20" }]}>
                      <Feather name="zap" size={18} color={colors.xpGold} />
                    </View>
                    <Text style={[styles.balanceLabel, { color: colors.xpGold + "CC" }]}>
                      Zero Points
                    </Text>
                    <Text style={[styles.balanceAmount, { color: colors.xpGold }]}>
                      {wallet.xpBalance.toLocaleString()}
                    </Text>
                    <Text style={[styles.balanceUnit, { color: colors.xpGold + "88" }]}>XP</Text>
                  </View>

                  {/* Cash / Funds */}
                  <View style={[styles.balanceCard, { backgroundColor: "#001A10", borderColor: "#10B981" + "40" }]}>
                    <View style={[styles.balanceIconWrap, { backgroundColor: "#10B981" + "20" }]}>
                      <Feather name="credit-card" size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.balanceLabel, { color: "#10B981CC" }]}>Cash Balance</Text>
                    <Text style={[styles.balanceAmount, { color: "#10B981" }]}>
                      {formatNaira(wallet.fundsBalance ?? 0)}
                    </Text>
                    <Text style={[styles.balanceUnit, { color: "#10B98188" }]}>NGN</Text>
                  </View>
                </View>

                {/* Level Card */}
                <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.levelRow}>
                    <View style={[styles.levelCircle, { backgroundColor: colors.primary }]}>
                      <Text style={styles.levelNumber}>{wallet.level}</Text>
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={[styles.levelName, { color: colors.foreground }]}>
                        {user?.displayName ?? "Builder"}
                      </Text>
                      <Text style={[styles.levelLabel, { color: colors.mutedForeground }]}>
                        Level {wallet.level} · {wallet.xpToNextLevel} XP to next level
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.primary, width: `${xpProgress}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                      Lv {wallet.level}
                    </Text>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                      Lv {wallet.level + 1}
                    </Text>
                  </View>
                </View>

                {/* Withdrawal hint */}
                {!canWithdraw && (
                  <View style={[styles.hintCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="info" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                      Earn {(minXp - wallet.xpBalance).toLocaleString()} more XP to unlock cash withdrawal (min {minXp.toLocaleString()} XP = {formatNaira(minXp * 10)})
                    </Text>
                  </View>
                )}

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {events?.filter((e) => e.source === "proof_project").length ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Proofs</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {events?.filter((e) => e.source === "bootcamp_completed").length ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Bootcamps</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {withdrawals?.length ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Withdrawals</Text>
                  </View>
                </View>
              </>
            ) : null}
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>Zero Points History</Text>
          </>
        }
        ListEmptyComponent={
          eventsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Feather name="zap" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No activity yet. Start posting!
              </Text>
            </View>
          )
        }
        renderItem={({ item }: { item: XpEvent }) => {
          const icon = SOURCE_ICONS[item.source] ?? "zap";
          return (
            <View style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.eventIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name={icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventSource, { color: colors.foreground }]}>
                  {SOURCE_LABELS[item.source] ?? item.source}
                </Text>
                {item.detail && (
                  <Text style={[styles.eventDetail, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.detail}
                  </Text>
                )}
                <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                  {timeAgo(new Date(item.createdAt as string))}
                </Text>
              </View>
              <View style={styles.eventXp}>
                <Feather name="zap" size={12} color={colors.xpGold} />
                <Text style={[styles.eventAmount, { color: colors.xpGold }]}>+{item.amount}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Withdraw Modal */}
      <Modal visible={withdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Request Withdrawal</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              1,000 XP = {formatNaira(10000)} · Min {(wallet?.minWithdrawalXp ?? 2000).toLocaleString()} XP
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>XP to withdraw</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="zap" size={16} color={colors.xpGold} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder={`Min ${wallet?.minWithdrawalXp ?? 2000}`}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                value={withdrawXp}
                onChangeText={setWithdrawXp}
              />
              {withdrawXp && !isNaN(parseInt(withdrawXp, 10)) && (
                <Text style={[styles.convertedAmount, { color: "#10B981" }]}>
                  = {formatNaira(parseInt(withdrawXp, 10) * 10)}
                </Text>
              )}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bank account</Text>
            {!bankAccounts?.length ? (
              <View style={[styles.noAccountBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
                <Text style={[styles.noAccountText, { color: colors.mutedForeground }]}>
                  No bank account added. Go to Settings to add one.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.accountList} showsVerticalScrollIndicator={false}>
                {bankAccounts.map((acct) => (
                  <TouchableOpacity
                    key={acct.id}
                    style={[
                      styles.accountOption,
                      {
                        backgroundColor: selectedAccount?.id === acct.id ? colors.primary + "22" : colors.muted,
                        borderColor: selectedAccount?.id === acct.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedAccount(acct)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.accountOptionInfo}>
                      <Text style={[styles.accountBankName, { color: colors.foreground }]}>
                        {acct.bankName}
                      </Text>
                      <Text style={[styles.accountDetails, { color: colors.mutedForeground }]}>
                        {acct.accountNumber} · {acct.accountName}
                      </Text>
                    </View>
                    {selectedAccount?.id === acct.id && (
                      <Feather name="check-circle" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.muted }]}
                onPress={() => setWithdrawModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: createWithdrawal.isPending ? colors.muted : colors.primary },
                ]}
                onPress={handleWithdrawSubmit}
                disabled={createWithdrawal.isPending}
              >
                {createWithdrawal.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Request Withdrawal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, marginTop: 1 },
  withdrawHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  withdrawHeaderText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  balanceRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  balanceCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  balanceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  balanceLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  balanceAmount: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  balanceUnit: { fontSize: 11, fontWeight: "600" },
  levelCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: { color: "#fff", fontSize: 20, fontWeight: "800" },
  levelInfo: { flex: 1 },
  levelName: { fontSize: 15, fontWeight: "700" },
  levelLabel: { fontSize: 12, marginTop: 1 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%" as `${number}%`, borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11 },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, textAlign: "center" },
  historyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfo: { flex: 1, gap: 2 },
  eventSource: { fontSize: 14, fontWeight: "600" },
  eventDetail: { fontSize: 12 },
  eventTime: { fontSize: 11 },
  eventXp: { flexDirection: "row", alignItems: "center", gap: 3 },
  eventAmount: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 14, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
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
  modalTitle: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, marginTop: -6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: -4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 16, fontWeight: "600" },
  convertedAmount: { fontSize: 13, fontWeight: "700" },
  noAccountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noAccountText: { flex: 1, fontSize: 13 },
  accountList: { maxHeight: 160 },
  accountOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  accountOptionInfo: { flex: 1 },
  accountBankName: { fontSize: 14, fontWeight: "600" },
  accountDetails: { fontSize: 12, marginTop: 1 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalSubmitBtn: {
    flex: 2,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
  },
  modalSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
