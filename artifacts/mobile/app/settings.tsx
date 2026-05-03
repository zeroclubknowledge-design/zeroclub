import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getListBankAccountsQueryOptions,
  getListBankAccountsQueryKey,
  useCreateBankAccount,
  useDeleteBankAccount,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useDialog } from "@/context/DialogContext";

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

const TRACKS = Object.keys(TRACK_LABELS);

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, logout, updateUser } = useAuth();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const [editModal, setEditModal] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [school, setSchool] = useState(user?.school ?? "");
  const [track, setTrack] = useState(user?.track ?? "frontend");
  const [savingProfile, setSavingProfile] = useState(false);

  const [addBankModal, setAddBankModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const { data: bankAccounts, isLoading: accountsLoading } = useQuery(getListBankAccountsQueryOptions());
  const createBankAccount = useCreateBankAccount();
  const deleteBankAccount = useDeleteBankAccount();

  const handleSaveProfile = async () => {
    if (!user || !token) return;
    setSavingProfile(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const baseUrl = domain ? `https://${domain}` : "";
      const res = await fetch(`${baseUrl}/api/profiles/${user.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName, bio, school, track }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json() as typeof user;
      await updateUser({ ...user, ...updated });
      setEditModal(false);
      showToast({ type: "success", title: "Profile saved", message: "Your profile has been updated" });
    } catch {
      showToast({ type: "error", title: "Could not save profile", message: "Try again." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddBankAccount = () => {
    if (!bankName || !accountNumber || !accountName) {
      showToast({ type: "warning", title: "Missing fields", message: "Please fill in all bank account fields" });
      return;
    }
    createBankAccount.mutate(
      { data: { bankName, accountNumber, accountName } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListBankAccountsQueryKey() });
          setAddBankModal(false);
          setBankName("");
          setAccountNumber("");
          setAccountName("");
          showToast({ type: "success", title: "Bank account added" });
        },
        onError: () => {
          showToast({ type: "error", title: "Could not add bank account" });
        },
      },
    );
  };

  const handleDeleteAccount = (id: string, name: string) => {
    showDialog({
      title: "Remove Account",
      message: `Remove "${name}" from your saved accounts?`,
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deleteBankAccount.mutate({ id }, {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: getListBankAccountsQueryKey() });
                showToast({ type: "success", title: "Account removed" });
              },
            });
          },
        },
      ],
    });
  };

  const handleLogout = () => {
    showDialog({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <SectionHeader icon="user" title="Profile" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="user" label="Display Name" value={user?.displayName ?? "—"} colors={colors} />
          <Separator colors={colors} />
          <InfoRow icon="at-sign" label="Username" value={`@${user?.username ?? "—"}`} colors={colors} />
          <Separator colors={colors} />
          <InfoRow icon="mail" label="Email" value={user?.email ?? "—"} colors={colors} />
          <Separator colors={colors} />
          <InfoRow icon="map-pin" label="Institution" value={user?.school ?? "Not set"} colors={colors} />
          <Separator colors={colors} />
          <InfoRow
            icon="layers"
            label="Track"
            value={TRACK_LABELS[user?.track ?? "frontend"] ?? user?.track ?? "—"}
            colors={colors}
          />
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            setDisplayName(user?.displayName ?? "");
            setBio(user?.bio ?? "");
            setSchool(user?.school ?? "");
            setTrack(user?.track ?? "frontend");
            setEditModal(true);
          }}
          activeOpacity={0.8}
        >
          <Feather name="edit-2" size={15} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Bank Accounts */}
        <SectionHeader icon="credit-card" title="Bank Accounts" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {accountsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
          ) : bankAccounts?.length ? (
            bankAccounts.map((acct, i) => (
              <View key={acct.id}>
                {i > 0 && <Separator colors={colors} />}
                <View style={styles.bankRow}>
                  <View style={[styles.bankIcon, { backgroundColor: colors.primary + "22" }]}>
                    <Feather name="credit-card" size={15} color={colors.primary} />
                  </View>
                  <View style={styles.bankInfo}>
                    <Text style={[styles.bankName, { color: colors.foreground }]}>{acct.bankName}</Text>
                    <Text style={[styles.bankDetails, { color: colors.mutedForeground }]}>
                      {acct.accountNumber} · {acct.accountName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteAccount(acct.id, acct.bankName)}
                    style={styles.deleteBtn}
                  >
                    <Feather name="trash-2" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Feather name="credit-card" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bank accounts added</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setAddBankModal(true)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={15} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Add Bank Account</Text>
        </TouchableOpacity>

        {/* Account */}
        <SectionHeader icon="shield" title="Account" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="bell"
            label="Notifications"
            value="Enabled"
            colors={colors}
            onPress={() => router.push("/notifications" as never)}
          />
          <Separator colors={colors} />
          <SettingRow
            icon="help-circle"
            label="Help & Support"
            colors={colors}
            onPress={() => showDialog({ title: "Help & Support", message: "Email us at support@zeroclub.io", buttons: [{ text: "Got it" }] })}
          />
          <Separator colors={colors} />
          <SettingRow
            icon="file-text"
            label="Terms & Privacy"
            colors={colors}
            onPress={() => showDialog({ title: "Terms & Privacy", message: "Visit zeroclubapp.com/terms for our full terms of service and privacy policy.", buttons: [{ text: "Got it" }] })}
          />
        </View>

        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: colors.card, borderColor: "#ef444440" }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={16} color="#ef4444" />
          <Text style={[styles.signOutText, { color: "#ef4444" }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <ModalInput label="Display Name" value={displayName} onChangeText={setDisplayName} colors={colors} />
                <ModalInput label="Bio" value={bio} onChangeText={setBio} colors={colors} multiline />
                <ModalInput label="Institution / School" value={school} onChangeText={setSchool} colors={colors} />
                <Text style={[styles.modalFieldLabel, { color: colors.mutedForeground }]}>Track</Text>
                <View style={styles.trackGrid}>
                  {TRACKS.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.trackChip,
                        {
                          backgroundColor: track === t ? colors.primary : colors.muted,
                          borderColor: track === t ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setTrack(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.trackChipText, { color: track === t ? "#fff" : colors.mutedForeground }]}>
                        {TRACK_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: savingProfile ? colors.muted : colors.primary }]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  activeOpacity={0.85}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Bank Account Modal */}
      <Modal visible={addBankModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Bank Account</Text>
              <TouchableOpacity onPress={() => setAddBankModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <ModalInput
                label="Bank Name (e.g. Zenith Bank)"
                value={bankName}
                onChangeText={setBankName}
                colors={colors}
              />
              <ModalInput
                label="Account Number"
                value={accountNumber}
                onChangeText={setAccountNumber}
                colors={colors}
                keyboardType="number-pad"
              />
              <ModalInput
                label="Account Name"
                value={accountName}
                onChangeText={setAccountName}
                colors={colors}
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: createBankAccount.isPending ? colors.muted : colors.primary }]}
                onPress={handleAddBankAccount}
                disabled={createBankAccount.isPending}
                activeOpacity={0.85}
              >
                {createBankAccount.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Add Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon} size={14} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={15} color={colors.mutedForeground} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  colors,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <Feather name={icon} size={15} color={colors.mutedForeground} />
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>}
        <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

function Separator({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return <View style={[styles.sep, { backgroundColor: colors.border }]} />;
}

function ModalInput({
  label,
  value,
  onChangeText,
  colors,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "email-address";
}) {
  return (
    <View style={styles.modalField}>
      <Text style={[styles.modalFieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          styles.modalInput,
          { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground },
          multiline && { minHeight: 70, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        placeholderTextColor={colors.mutedForeground}
      />
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  content: { padding: 16, gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: "500", marginTop: 1 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 13 },
  sep: { height: 1, marginHorizontal: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: "700" },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  bankIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 14, fontWeight: "600" },
  bankDetails: { fontSize: 12, marginTop: 1 },
  deleteBtn: { padding: 4 },
  emptyBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  signOutText: { fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  modalContent: { gap: 12 },
  modalField: { gap: 6 },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  trackGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trackChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  trackChipText: { fontSize: 12, fontWeight: "600" },
  saveBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
    flexDirection: "row",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
