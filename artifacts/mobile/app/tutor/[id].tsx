import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  ActivityIndicator,
  Image,
  Switch,
  Alert,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { TutorBootcamp, TutorModule } from "@/app/(tabs)/studio";

const BASE_URL = () => {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}` : "";
};

const TRACKS = [
  { key: "product_design", label: "Product Design" },
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "full_stack", label: "Full Stack" },
  { key: "growth", label: "Growth" },
  { key: "branding", label: "Branding" },
  { key: "mentorship", label: "Mentorship" },
  { key: "vibe_coding", label: "Vibe Coding" },
  { key: "video_editing", label: "Video Editing" },
  { key: "motion_design", label: "Motion Design" },
];

const DIFFICULTIES = [
  { key: "beginner", label: "Beginner", color: "#10B981" },
  { key: "intermediate", label: "Intermediate", color: "#F59E0B" },
  { key: "advanced", label: "Advanced", color: "#EF4444" },
];

const DELIVERY_MEDIUMS = [
  { key: "video", label: "Video", icon: "play-circle" as const },
  { key: "live", label: "Live", icon: "radio" as const },
  { key: "text", label: "Text", icon: "book-open" as const },
  { key: "hybrid", label: "Hybrid", icon: "layers" as const },
];

interface StudentEnrollment {
  id: string;
  userId: string;
  bootcampId: string;
  modulesCompleted: number;
  progress: number;
  paid: boolean;
  createdAt: string;
  profile: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    track: string;
    xpBalance: number;
  } | null;
}

type Tab = "info" | "modules" | "students" | "channels";

function PickerRow({ label, options, value, onChange, colors }: {
  label: string;
  options: { key: string; label: string; color?: string; icon?: keyof typeof Feather.glyphMap }[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {options.map((o) => {
            const active = value === o.key;
            const accent = o.color ?? colors.primary;
            return (
              <TouchableOpacity
                key={o.key}
                onPress={() => onChange(o.key)}
                style={[styles.pill, { backgroundColor: active ? accent : colors.muted, borderColor: active ? accent : colors.border }]}
                activeOpacity={0.8}
              >
                {o.icon && <Feather name={o.icon} size={11} color={active ? "#fff" : colors.mutedForeground} />}
                <Text style={[styles.pillText, { color: active ? "#fff" : colors.mutedForeground }]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function ModuleItem({ mod, colors, token, bootcampId, onUpdated }: {
  mod: TutorModule;
  colors: ReturnType<typeof useColors>;
  token: string | null;
  bootcampId: string;
  onUpdated: () => void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(mod.title);
  const [description, setDescription] = useState(mod.description);
  const [duration, setDuration] = useState(String(mod.durationMinutes));
  const [xpReward, setXpReward] = useState(String(mod.xpReward));
  const [isPreview, setIsPreview] = useState(mod.isPreview);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL()}/api/tutor/modules/${mod.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title, description,
          durationMinutes: parseInt(duration || "20", 10),
          xpReward: parseInt(xpReward || "25", 10),
          isPreview,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast({ type: "success", title: "Module updated" });
      setEditing(false);
      onUpdated();
    } catch {
      showToast({ type: "error", title: "Save failed", message: "Please try again" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (!confirm(`Delete module "${mod.title}"?`)) return;
      void doDelete();
    } else {
      Alert.alert("Delete Module", `Delete "${mod.title}"? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  };

  const doDelete = async () => {
    try {
      await fetch(`${BASE_URL()}/api/tutor/modules/${mod.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      showToast({ type: "success", title: "Module deleted" });
      onUpdated();
    } catch {
      showToast({ type: "error", title: "Delete failed" });
    }
  };

  if (editing) {
    return (
      <View style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.primary + "60" }]}>
        <TextInput
          style={[styles.modInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Module title"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.modInput, styles.modTextarea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What students will learn"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
        />
        <View style={styles.modRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modLabel, { color: colors.mutedForeground }]}>Duration (min)</Text>
            <TextInput
              style={[styles.modInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modLabel, { color: colors.mutedForeground }]}>XP Reward</Text>
            <TextInput
              style={[styles.modInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={xpReward}
              onChangeText={setXpReward}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>Free Preview</Text>
            <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Non-enrolled students can access this</Text>
          </View>
          <Switch value={isPreview} onValueChange={setIsPreview} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor="#fff" />
        </View>
        <View style={styles.modActions}>
          <TouchableOpacity onPress={() => setEditing(false)} style={[styles.modCancelBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
            <Text style={[styles.modCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.modSaveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modSaveText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.moduleRow}>
        <View style={[styles.modIndex, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.modIndexText, { color: colors.primary }]}>{mod.orderIndex + 1}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.modTitle, { color: colors.foreground }]} numberOfLines={1}>{mod.title}</Text>
            {mod.isPreview && (
              <View style={[styles.previewBadge, { backgroundColor: "#10B981" + "20" }]}>
                <Text style={[styles.previewBadgeText, { color: "#10B981" }]}>Free</Text>
              </View>
            )}
          </View>
          <View style={styles.modMeta}>
            <Feather name="clock" size={10} color={colors.mutedForeground} />
            <Text style={[styles.modMetaText, { color: colors.mutedForeground }]}>{mod.durationMinutes} min</Text>
            <Text style={[styles.modMetaText, { color: colors.mutedForeground }]}>·</Text>
            <Feather name="zap" size={10} color={colors.mutedForeground} />
            <Text style={[styles.modMetaText, { color: colors.mutedForeground }]}>{mod.xpReward} XP</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <TouchableOpacity onPress={() => setEditing(true)} style={[styles.iconBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
            <Feather name="edit-2" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.iconBtn, { backgroundColor: "#EF4444" + "15" }]} activeOpacity={0.7}>
            <Feather name="trash-2" size={13} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function AddModuleForm({ bootcampId, token, colors, onAdded }: {
  bootcampId: string; token: string | null;
  colors: ReturnType<typeof useColors>; onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("20");
  const [xpReward, setXpReward] = useState("25");
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || !description.trim()) {
      showToast({ type: "warning", title: "Missing fields", message: "Title and description required" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL()}/api/tutor/bootcamps/${bootcampId}/modules`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          durationMinutes: parseInt(duration || "20", 10),
          xpReward: parseInt(xpReward || "25", 10),
          isPreview,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast({ type: "success", title: "Module added!" });
      setTitle(""); setDescription(""); setDuration("20"); setXpReward("25"); setIsPreview(false);
      setOpen(false);
      onAdded();
    } catch {
      showToast({ type: "error", title: "Failed to add module" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <TouchableOpacity
        style={[styles.addModBtn, { borderColor: colors.primary + "50", backgroundColor: colors.primary + "10" }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={16} color={colors.primary} />
        <Text style={[styles.addModText, { color: colors.primary }]}>Add Module</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.primary + "60" }]}>
      <Text style={[styles.fieldLabel, { color: colors.primary }]}>NEW MODULE</Text>
      <TextInput
        style={[styles.modInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
        value={title} onChangeText={setTitle}
        placeholder="Module title" placeholderTextColor={colors.mutedForeground}
      />
      <TextInput
        style={[styles.modInput, styles.modTextarea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
        value={description} onChangeText={setDescription}
        placeholder="What students will learn" placeholderTextColor={colors.mutedForeground}
        multiline numberOfLines={3}
      />
      <View style={styles.modRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.modLabel, { color: colors.mutedForeground }]}>Duration (min)</Text>
          <TextInput
            style={[styles.modInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={duration} onChangeText={setDuration} keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.modLabel, { color: colors.mutedForeground }]}>XP Reward</Text>
          <TextInput
            style={[styles.modInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={xpReward} onChangeText={setXpReward} keyboardType="numeric"
          />
        </View>
      </View>
      <View style={styles.switchRow}>
        <View>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>Free Preview</Text>
          <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Let non-enrolled students access this</Text>
        </View>
        <Switch value={isPreview} onValueChange={setIsPreview} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor="#fff" />
      </View>
      <View style={styles.modActions}>
        <TouchableOpacity onPress={() => setOpen(false)} style={[styles.modCancelBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
          <Text style={[styles.modCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAdd} disabled={saving} style={[styles.modSaveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modSaveText}>Add Module</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TutorBootcampDetailScreen() {
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) ?? "info");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const headers = { Authorization: `Bearer ${token ?? ""}` };

  const { data: bootcamp, isLoading, refetch, isRefetching } = useQuery<TutorBootcamp>({
    queryKey: ["tutor-bootcamp", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL()}/api/tutor/bootcamps/${id}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<TutorBootcamp>;
    },
    enabled: !!id,
  });

  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } = useQuery<StudentEnrollment[]>({
    queryKey: ["tutor-students", id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL()}/api/tutor/bootcamps/${id}/students`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<StudentEnrollment[]>;
    },
    enabled: !!id && activeTab === "students",
  });

  const [form, setForm] = useState({
    title: "", subtitle: "", description: "",
    track: "frontend", difficulty: "beginner", deliveryMedium: "video",
    xpReward: "100", price: "", isFree: true, coverUrl: null as string | null,
  });

  React.useEffect(() => {
    if (bootcamp && !saving) {
      setForm({
        title: bootcamp.title,
        subtitle: bootcamp.subtitle,
        description: bootcamp.description,
        track: bootcamp.track,
        difficulty: bootcamp.difficulty,
        deliveryMedium: bootcamp.deliveryMedium,
        xpReward: String(bootcamp.xpReward),
        price: bootcamp.priceCents > 0 ? String(bootcamp.priceCents / 100) : "",
        isFree: bootcamp.priceCents === 0,
        coverUrl: bootcamp.coverUrl,
      });
    }
  }, [bootcamp, saving]);

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const mimeType = asset.type === "video" ? `video/${ext}` : `image/${ext}`;
      formData.append("file", { uri: asset.uri, name: `cover.${ext}`, type: mimeType } as unknown as Blob);
      const res = await fetch(`${BASE_URL()}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string };
      setForm((f) => ({ ...f, coverUrl: data.url }));
      showToast({ type: "success", title: "Cover updated!" });
    } catch {
      showToast({ type: "error", title: "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL()}/api/tutor/bootcamps/${id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle,
          description: form.description,
          track: form.track,
          difficulty: form.difficulty,
          deliveryMedium: form.deliveryMedium,
          xpReward: parseInt(form.xpReward || "100", 10),
          priceCents: form.isFree ? 0 : Math.round(parseFloat(form.price || "0") * 100),
          coverUrl: form.coverUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      await refetch();
      await qc.invalidateQueries({ queryKey: ["tutor-bootcamps"] });
      showToast({ type: "success", title: "Bootcamp updated!" });
    } catch {
      showToast({ type: "error", title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const doIt = async () => {
      try {
        await fetch(`${BASE_URL()}/api/tutor/bootcamps/${id}`, {
          method: "DELETE", headers,
        });
        await qc.invalidateQueries({ queryKey: ["tutor-bootcamps"] });
        await qc.invalidateQueries({ queryKey: ["tutor-stats"] });
        showToast({ type: "success", title: "Bootcamp deleted" });
        router.replace("/(tabs)/studio" as never);
      } catch {
        showToast({ type: "error", title: "Delete failed" });
      }
    };
    if (Platform.OS === "web") {
      if (!confirm("Delete this bootcamp? This cannot be undone.")) return;
      void doIt();
    } else {
      Alert.alert("Delete Bootcamp", "This will permanently delete the bootcamp and all its modules.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void doIt() },
      ]);
    }
  };

  const TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "info", label: "Info", icon: "info" },
    { key: "modules", label: "Modules", icon: "layers" },
    { key: "students", label: "Students", icon: "users" },
    { key: "channels", label: "Community", icon: "message-circle" },
  ];

  const coverUri = form.coverUrl?.startsWith("/") ? `${BASE_URL()}/api${form.coverUrl}` : (form.coverUrl ?? undefined);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!bootcamp) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Bootcamp not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]} numberOfLines={1}>{bootcamp.title}</Text>
        <TouchableOpacity onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: "#EF4444" + "15" }]} activeOpacity={0.7}>
          <Feather name="trash-2" size={15} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tabItem, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            activeOpacity={0.7}
          >
            <Feather name={t.icon} size={14} color={activeTab === t.key ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info Tab */}
      {activeTab === "info" && (
        <ScrollView
          contentContainerStyle={[styles.tabContent, { paddingBottom: bottomPadding + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover */}
          <TouchableOpacity onPress={pickCover} disabled={uploading} activeOpacity={0.8}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {uploading ? <ActivityIndicator color={colors.primary} /> : (
                  <>
                    <Feather name="camera" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.coverPlaceholderText, { color: colors.mutedForeground }]}>Add cover image or video</Text>
                  </>
                )}
              </View>
            )}
            {coverUri && (
              <View style={styles.coverOverlay}>
                <View style={styles.coverOverlayBtn}>
                  <Feather name="camera" size={12} color="#fff" />
                  <Text style={styles.coverOverlayText}>Change cover</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.fields}>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title *</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Subtitle *</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                value={form.subtitle} onChangeText={(v) => setForm((f) => ({ ...f, subtitle: v }))} />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description *</Text>
              <TextInput style={[styles.input, styles.textarea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline numberOfLines={4} />
            </View>
            <PickerRow label="Track" options={TRACKS} value={form.track} onChange={(v) => setForm((f) => ({ ...f, track: v }))} colors={colors} />
            <PickerRow label="Difficulty" options={DIFFICULTIES} value={form.difficulty} onChange={(v) => setForm((f) => ({ ...f, difficulty: v }))} colors={colors} />
            <PickerRow label="Delivery" options={DELIVERY_MEDIUMS} value={form.deliveryMedium} onChange={(v) => setForm((f) => ({ ...f, deliveryMedium: v }))} colors={colors} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>XP Reward</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                value={form.xpReward} onChangeText={(v) => setForm((f) => ({ ...f, xpReward: v }))} keyboardType="numeric" />
            </View>
            <View style={[styles.pricingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PRICING</Text>
              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.switchLabel, { color: colors.foreground }]}>Free Bootcamp</Text>
                  <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Students enroll without payment</Text>
                </View>
                <Switch value={form.isFree} onValueChange={(v) => setForm((f) => ({ ...f, isFree: v }))}
                  trackColor={{ false: colors.muted, true: colors.primary }} thumbColor="#fff" />
              </View>
              {!form.isFree && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Price (₦)</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                    value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} keyboardType="numeric" />
                </View>
              )}
            </View>

            {/* Status */}
            <View style={[styles.statusCard, { backgroundColor: bootcamp.adminReviewed ? "#10B981" + "15" : "#F59E0B" + "15", borderColor: bootcamp.adminReviewed ? "#10B981" + "40" : "#F59E0B" + "40" }]}>
              <Feather name={bootcamp.adminReviewed ? "check-circle" : "clock"} size={16} color={bootcamp.adminReviewed ? "#10B981" : "#F59E0B"} />
              <View>
                <Text style={[styles.switchLabel, { color: bootcamp.adminReviewed ? "#10B981" : "#F59E0B" }]}>
                  {bootcamp.adminReviewed ? "Live" : "Pending Review"}
                </Text>
                <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
                  {bootcamp.adminReviewed ? "Students can enroll and view this bootcamp" : "Admin will review and approve within 48h"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSaveInfo} disabled={saving}
              style={[styles.saveInfoBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Modules Tab */}
      {activeTab === "modules" && (
        <FlatList
          data={bootcamp.modules}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 40, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>
              {bootcamp.modules.length} MODULE{bootcamp.modules.length !== 1 ? "S" : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyModules}>
              <Feather name="layers" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyModTitle, { color: colors.foreground }]}>No modules yet</Text>
              <Text style={[styles.emptyModSub, { color: colors.mutedForeground }]}>Add your first module below</Text>
            </View>
          }
          ListFooterComponent={
            <AddModuleForm
              bootcampId={id ?? ""}
              token={token}
              colors={colors}
              onAdded={() => { void refetch(); void qc.invalidateQueries({ queryKey: ["tutor-bootcamps"] }); }}
            />
          }
          renderItem={({ item }) => (
            <ModuleItem
              mod={item}
              colors={colors}
              token={token}
              bootcampId={id ?? ""}
              onUpdated={() => { void refetch(); }}
            />
          )}
        />
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <FlatList
          data={students ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 40, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={studentsLoading} onRefresh={refetchStudents} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>
              {bootcamp.enrollmentCount} ENROLLED STUDENT{bootcamp.enrollmentCount !== 1 ? "S" : ""}
            </Text>
          }
          ListEmptyComponent={
            studentsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyModules}>
                <Feather name="users" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyModTitle, { color: colors.foreground }]}>No students yet</Text>
                <Text style={[styles.emptyModSub, { color: colors.mutedForeground }]}>Students will appear here once they enroll</Text>
              </View>
            )
          }
          renderItem={({ item: s }) => (
            <View style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.studentAvatar, { backgroundColor: colors.primary + "20" }]}>
                {s.profile?.avatarUrl ? (
                  <Image source={{ uri: s.profile.avatarUrl }} style={styles.studentAvatarImg} />
                ) : (
                  <Text style={[styles.studentAvatarText, { color: colors.primary }]}>
                    {(s.profile?.displayName ?? "?")[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.studentName, { color: colors.foreground }]}>
                  {s.profile?.displayName ?? "Unknown"}
                </Text>
                <Text style={[styles.studentUsername, { color: colors.mutedForeground }]}>
                  @{s.profile?.username ?? "—"}
                </Text>
                <View style={styles.progressRow}>
                  <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                    <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${s.progress}%` as unknown as number }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.mutedForeground }]}>{s.progress}%</Text>
                </View>
              </View>
              {s.paid && (
                <View style={[styles.paidBadge, { backgroundColor: "#10B981" + "20" }]}>
                  <Text style={[styles.paidBadgeText, { color: "#10B981" }]}>Paid</Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Community Tab */}
      {activeTab === "channels" && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BOOTCAMP CHANNELS</Text>
          <View style={[styles.communityNote, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.communityNoteText, { color: colors.mutedForeground }]}>
              You are the admin of these channels. Students enrolled in this bootcamp can participate.
            </Text>
          </View>
          {["General", "Show & Tell", "Resources", "Feedback"].map((ch) => (
            <TouchableOpacity
              key={ch}
              style={[styles.channelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(tabs)/chat" as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.channelIcon, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="hash" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.channelName, { color: colors.foreground }]}>{ch}</Text>
                <Text style={[styles.channelSub, { color: colors.mutedForeground }]}>Tap to open channel</Text>
              </View>
              <View style={[styles.adminBadge, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="shield" size={10} color={colors.primary} />
                <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Admin</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  topBarTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  deleteBtn: { padding: 8, borderRadius: 10 },
  tabBar: {
    flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 12,
  },
  tabLabel: { fontSize: 12, fontWeight: "600" },
  tabContent: { padding: 16, gap: 16 },
  coverImage: { width: "100%", height: 180, backgroundColor: "#1A1A1A" },
  coverPlaceholder: {
    height: 150, alignItems: "center", justifyContent: "center", gap: 6,
    margin: 16, borderRadius: 14, borderWidth: 2, borderStyle: "dashed",
  },
  coverPlaceholderText: { fontSize: 13 },
  coverOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 40,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  coverOverlayBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  coverOverlayText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  fields: { gap: 16 },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 5 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  pricingCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { fontSize: 14, fontWeight: "600" },
  switchSub: { fontSize: 11, marginTop: 1 },
  statusCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  saveInfoBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  moduleCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  moduleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modIndex: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modIndexText: { fontSize: 12, fontWeight: "700" },
  modTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  previewBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  previewBadgeText: { fontSize: 9, fontWeight: "700" },
  modMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  modMetaText: { fontSize: 10 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  modTextarea: { minHeight: 70, textAlignVertical: "top" },
  modRow: { flexDirection: "row", gap: 10 },
  modLabel: { fontSize: 10, fontWeight: "600", marginBottom: 4 },
  modActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  modCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  modCancelText: { fontSize: 13, fontWeight: "600" },
  modSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  modSaveText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  addModBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, padding: 14, borderRadius: 14, borderWidth: 2, borderStyle: "dashed",
  },
  addModText: { fontSize: 14, fontWeight: "600" },
  emptyModules: { alignItems: "center", paddingVertical: 40, gap: 6 },
  emptyModTitle: { fontSize: 16, fontWeight: "700" },
  emptyModSub: { fontSize: 13 },
  studentCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  studentAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  studentAvatarText: { fontSize: 15, fontWeight: "700" },
  studentName: { fontSize: 14, fontWeight: "600" },
  studentUsername: { fontSize: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 11, width: 30 },
  paidBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  paidBadgeText: { fontSize: 10, fontWeight: "700" },
  communityNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  communityNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  channelCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  channelIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  channelName: { fontSize: 14, fontWeight: "600" },
  channelSub: { fontSize: 11, marginTop: 1 },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  adminBadgeText: { fontSize: 9, fontWeight: "700" },
});
