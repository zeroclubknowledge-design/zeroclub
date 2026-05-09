import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@workspace/supabase";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

export default function TutorBootcampScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const { user } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [moduleModal, setModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [moduleDuration, setModuleDuration] = useState("20");
  const [moduleXp, setModuleXp] = useState("25");
  const [modulePreview, setModulePreview] = useState(false);
  const [savingModule, setSavingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch bootcamp details
  const { data: bootcamp, isLoading, refetch } = useQuery({
    queryKey: ["tutor-bootcamp", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("bootcamps")
        .select(`
          *,
          modules:bootcamp_modules (*),
          enrollments:enrollments (
            id,
            progress,
            user:profiles (display_name, username, avatar_url)
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return {
        ...data,
        priceCents: data.price_cents,
        xpReward: data.xp_reward,
        coverUrl: data.cover_url,
        deliveryMedium: data.delivery_medium,
        adminReviewed: data.admin_reviewed,
        modulesCount: data.modules_count,
        modules: (data.modules || []).sort((a: any, b: any) => a.order_index - b.order_index).map((m: any) => ({
          ...m,
          durationMinutes: m.duration_minutes,
          xpReward: m.xp_reward,
          orderIndex: m.order_index,
          isPreview: m.is_preview,
        })),
        students: (data.enrollments || []).map((e: any) => ({
          id: e.id,
          progress: e.progress,
          displayName: e.user?.display_name ?? "Unknown",
          username: e.user?.username ?? "",
          avatarUrl: e.user?.avatar_url,
        })),
      };
    },
    enabled: !!id,
  });

  const openAddModule = () => {
    setEditingModuleId(null);
    setModuleTitle("");
    setModuleDesc("");
    setModuleDuration("20");
    setModuleXp("25");
    setModulePreview(false);
    setModuleModal(true);
  };

  const openEditModule = (m: any) => {
    setEditingModuleId(m.id);
    setModuleTitle(m.title);
    setModuleDesc(m.description);
    setModuleDuration(String(m.durationMinutes));
    setModuleXp(String(m.xpReward));
    setModulePreview(m.isPreview);
    setModuleModal(true);
  };

  const handleSaveModule = async () => {
    if (!moduleTitle.trim() || !moduleDesc.trim()) {
      showToast({ type: "warning", title: "Missing fields", message: "Title and description are required" });
      return;
    }
    setSavingModule(true);
    try {
      if (editingModuleId) {
        // Update existing module
        const { error } = await supabase
          .from("bootcamp_modules")
          .update({
            title: moduleTitle.trim(),
            description: moduleDesc.trim(),
            duration_minutes: parseInt(moduleDuration || "20", 10),
            xp_reward: parseInt(moduleXp || "25", 10),
            is_preview: modulePreview,
          })
          .eq("id", editingModuleId);
        if (error) throw error;
        showToast({ type: "success", title: "Module updated" });
      } else {
        // Create new module
        const nextOrder = (bootcamp?.modules?.length ?? 0);
        const newId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

        const { error } = await supabase.from("bootcamp_modules").insert({
          id: newId,
          bootcamp_id: id!,
          title: moduleTitle.trim(),
          description: moduleDesc.trim(),
          duration_minutes: parseInt(moduleDuration || "20", 10),
          xp_reward: parseInt(moduleXp || "25", 10),
          order_index: nextOrder,
          is_preview: modulePreview,
        });
        if (error) throw error;

        // Update modules_count on bootcamp
        await supabase
          .from("bootcamps")
          .update({ modules_count: nextOrder + 1 })
          .eq("id", id!);

        showToast({ type: "success", title: "Module added" });
      }

      setModuleModal(false);
      refetch();
      qc.invalidateQueries({ queryKey: ["tutor-bootcamps"] });
    } catch (err: any) {
      showToast({ type: "error", title: "Failed", message: err.message });
    } finally {
      setSavingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    setDeletingId(moduleId);
    try {
      const { error } = await supabase
        .from("bootcamp_modules")
        .delete()
        .eq("id", moduleId);
      if (error) throw error;

      // Update modules_count
      const newCount = Math.max(0, (bootcamp?.modules?.length ?? 1) - 1);
      await supabase
        .from("bootcamps")
        .update({ modules_count: newCount })
        .eq("id", id!);

      showToast({ type: "success", title: "Module deleted" });
      refetch();
      qc.invalidateQueries({ queryKey: ["tutor-bootcamps"] });
    } catch (err: any) {
      showToast({ type: "error", title: "Failed", message: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteBootcamp = async () => {
    try {
      const { error } = await supabase.from("bootcamps").delete().eq("id", id!);
      if (error) throw error;
      showToast({ type: "success", title: "Bootcamp deleted" });
      qc.invalidateQueries({ queryKey: ["tutor-bootcamps"] });
      qc.invalidateQueries({ queryKey: ["bootcamps"] });
      router.back();
    } catch (err: any) {
      showToast({ type: "error", title: "Failed", message: err.message });
    }
  };

  if (isLoading || !bootcamp) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Manage Bootcamp</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  const studentCount = bootcamp.students?.length ?? 0;
  const moduleCount = bootcamp.modules?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]} numberOfLines={1}>
          {bootcamp.title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Info Card ── */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: bootcamp.adminReviewed ? "#10B98120" : "#F59E0B20" }]}>
              <View style={[styles.statusDot, { backgroundColor: bootcamp.adminReviewed ? "#10B981" : "#F59E0B" }]} />
              <Text style={{ color: bootcamp.adminReviewed ? "#10B981" : "#F59E0B", fontSize: 12, fontWeight: "700" }}>
                {bootcamp.adminReviewed ? "Published" : "Pending Review"}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Track</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{bootcamp.track}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Difficulty</Text>
            <Text style={{ color: DIFFICULTY_COLORS[bootcamp.difficulty] ?? colors.foreground, fontWeight: "700", fontSize: 13 }}>
              {bootcamp.difficulty}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Price</Text>
            <Text style={[styles.infoValue, { color: colors.xpGold }]}>
              {bootcamp.priceCents === 0 ? "Free" : `₦${(bootcamp.priceCents / 100).toLocaleString("en-NG")}`}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>XP Reward</Text>
            <Text style={[styles.infoValue, { color: colors.xpGold }]}>{bootcamp.xpReward} XP</Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.miniStats}>
          <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={16} color={colors.primary} />
            <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{studentCount}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Students</Text>
          </View>
          <View style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="layers" size={16} color="#8B5CF6" />
            <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{moduleCount}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Modules</Text>
          </View>
        </View>

        {/* ── Modules Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Modules</Text>
          <TouchableOpacity
            style={[styles.addModuleBtn, { backgroundColor: colors.primary }]}
            onPress={openAddModule}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.addModuleBtnText}>Add Module</Text>
          </TouchableOpacity>
        </View>

        {moduleCount === 0 ? (
          <View style={[styles.emptyModules, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="layers" size={24} color={colors.mutedForeground} />
            <Text style={[styles.emptyModulesText, { color: colors.mutedForeground }]}>
              No modules yet. Add your first module to start building the curriculum.
            </Text>
          </View>
        ) : (
          bootcamp.modules.map((m: any, i: number) => (
            <View key={m.id} style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.moduleCardTop}>
                <View style={[styles.moduleIndex, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moduleTitle, { color: colors.foreground }]} numberOfLines={1}>{m.title}</Text>
                  <Text style={[styles.moduleDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{m.description}</Text>
                </View>
              </View>
              <View style={styles.moduleCardMeta}>
                <View style={styles.moduleMetaItem}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{m.durationMinutes}min</Text>
                </View>
                <View style={styles.moduleMetaItem}>
                  <Feather name="zap" size={11} color={colors.xpGold} />
                  <Text style={{ color: colors.xpGold, fontSize: 11 }}>{m.xpReward} XP</Text>
                </View>
                {m.isPreview && (
                  <View style={[styles.previewBadge, { backgroundColor: "#10B98120" }]}>
                    <Text style={{ color: "#10B981", fontSize: 10, fontWeight: "700" }}>FREE PREVIEW</Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => openEditModule(m)} style={styles.moduleAction} activeOpacity={0.7}>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteModule(m.id)}
                  style={styles.moduleAction}
                  activeOpacity={0.7}
                  disabled={deletingId === m.id}
                >
                  {deletingId === m.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ── Students Section ── */}
        {studentCount > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Students</Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{studentCount}</Text>
            </View>
            {bootcamp.students.map((s: any) => (
              <View key={s.id} style={[styles.studentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.studentAvatar, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
                    {(s.displayName ?? "?")[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: colors.foreground }]}>{s.displayName}</Text>
                  <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                    <View style={[styles.progressFill, { backgroundColor: s.progress === 100 ? "#10B981" : colors.primary, width: `${s.progress}%` as any }]} />
                  </View>
                </View>
                <Text style={{ color: s.progress === 100 ? "#10B981" : colors.mutedForeground, fontSize: 12, fontWeight: "700" }}>
                  {s.progress}%
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Danger Zone ── */}
        <View style={[styles.dangerZone, { borderColor: "#EF444440" }]}>
          <Text style={[styles.dangerTitle, { color: "#EF4444" }]}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.dangerBtn, { borderColor: "#EF444440" }]}
            onPress={handleDeleteBootcamp}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={14} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 13 }}>Delete Bootcamp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Add/Edit Module Modal ── */}
      <Modal visible={moduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingModuleId ? "Edit Module" : "Add Module"}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={moduleTitle}
              onChangeText={setModuleTitle}
              placeholder="Module title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={moduleDesc}
              onChangeText={setModuleDesc}
              placeholder="What students will learn in this module"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Duration (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={moduleDuration}
                  onChangeText={setModuleDuration}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>XP Reward</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={moduleXp}
                  onChangeText={setModuleXp}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Free Preview</Text>
                <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Visible without enrollment</Text>
              </View>
              <Switch
                value={modulePreview}
                onValueChange={setModulePreview}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.muted }]}
                onPress={() => setModuleModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: savingModule ? colors.muted : colors.primary }]}
                onPress={handleSaveModule}
                disabled={savingModule}
              >
                {savingModule ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingModuleId ? "Save Changes" : "Add Module"}</Text>
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
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16 },

  // Info card
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 13, fontWeight: "500" },
  infoValue: { fontSize: 13, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  // Mini stats
  miniStats: { flexDirection: "row", gap: 12, marginTop: 12 },
  miniStatCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  miniStatValue: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  miniStatLabel: { fontSize: 11 },

  // Section
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionCount: { fontSize: 14, fontWeight: "600" },
  addModuleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addModuleBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Module cards
  emptyModules: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyModulesText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  moduleCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  moduleCardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  moduleIndex: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  moduleTitle: { fontSize: 14, fontWeight: "700" },
  moduleDesc: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  moduleCardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  moduleMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  moduleAction: { padding: 6 },

  // Student rows
  studentRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  studentAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  studentName: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },

  // Danger zone
  dangerZone: { marginTop: 32, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  dangerTitle: { fontSize: 14, fontWeight: "700" },
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, justifyContent: "center", borderWidth: 1, borderRadius: 12 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#555", alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  rowFields: { flexDirection: "row", gap: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { fontSize: 14, fontWeight: "600" },
  switchSub: { fontSize: 12, marginTop: 1 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14 },
  cancelBtnText: { fontWeight: "700" },
  saveBtn: { flex: 2, alignItems: "center", paddingVertical: 14, borderRadius: 14 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});