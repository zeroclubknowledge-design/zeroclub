import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useQueryClient } from "@tanstack/react-query";

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

function PickerRow({ label, options, value, onChange, colors }: {
  label: string;
  options: { key: string; label: string; color?: string; icon?: keyof typeof Feather.glyphMap }[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {options.map((o) => {
            const active = value === o.key;
            const accent = o.color ?? colors.primary;
            return (
              <TouchableOpacity
                key={o.key}
                onPress={() => onChange(o.key)}
                style={[
                  styles.pill,
                  { backgroundColor: active ? accent : colors.muted, borderColor: active ? accent : colors.border },
                ]}
                activeOpacity={0.8}
              >
                {o.icon && <Feather name={o.icon} size={12} color={active ? "#fff" : colors.mutedForeground} />}
                <Text style={[styles.pillText, { color: active ? "#fff" : colors.mutedForeground }]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function CreateBootcampScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [track, setTrack] = useState("frontend");
  const [difficulty, setDifficulty] = useState("beginner");
  const [deliveryMedium, setDeliveryMedium] = useState("video");
  const [xpReward, setXpReward] = useState("100");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverMediaType, setCoverMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token ?? ""}` };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast({ type: "warning", title: "Permission needed", message: "Grant photo library access to upload" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      allowsEditing: true,
      videoMaxDuration: 60,
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
      const data = await res.json() as { url: string; mediaType: string };
      setCoverUrl(data.url);
      setCoverMediaType(data.mediaType === "video" ? "video" : "image");
      showToast({ type: "success", title: "Uploaded!", message: "Cover media ready" });
    } catch {
      showToast({ type: "error", title: "Upload failed", message: "Please try again" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !subtitle.trim() || !description.trim()) {
      showToast({ type: "warning", title: "Missing fields", message: "Title, subtitle, and description are required" });
      return;
    }
    setSaving(true);
    try {
      const priceCents = isFree ? 0 : Math.round(parseFloat(price || "0") * 100);
      const body = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        track,
        difficulty,
        deliveryMedium,
        xpReward: parseInt(xpReward || "100", 10),
        priceCents,
        coverUrl,
      };
      const res = await fetch(`${BASE_URL()}/api/tutor/bootcamps`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? "Failed to create bootcamp");
      }
      const created = await res.json() as { id: string };
      await qc.invalidateQueries({ queryKey: ["tutor-bootcamps"] });
      await qc.invalidateQueries({ queryKey: ["tutor-stats"] });
      showToast({ type: "success", title: "Bootcamp created!", message: "Now add modules to your bootcamp" });
      router.replace({ pathname: "/tutor/[id]", params: { id: created.id } } as never);
    } catch (err) {
      showToast({ type: "error", title: "Error", message: err instanceof Error ? err.message : "Failed to create" });
    } finally {
      setSaving(false);
    }
  };

  const coverUri = coverUrl?.startsWith("/") ? `${BASE_URL()}${coverUrl}` : coverUrl ?? undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Create Bootcamp</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Publish</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover media */}
        <TouchableOpacity onPress={pickMedia} disabled={uploading} activeOpacity={0.8}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Feather name="camera" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.coverPlaceholderText, { color: colors.mutedForeground }]}>
                    Tap to add cover image or video
                  </Text>
                  <Text style={[styles.coverPlaceholderHint, { color: colors.mutedForeground }]}>
                    PNG, JPG, MP4 · Max 100MB
                  </Text>
                </>
              )}
            </View>
          )}
          {coverUri && (
            <View style={styles.coverOverlay}>
              <View style={styles.coverOverlayBtn}>
                <Feather name="camera" size={14} color="#fff" />
                <Text style={styles.coverOverlayText}>Change {coverMediaType}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.fields}>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Advanced React Patterns"
              placeholderTextColor={colors.mutedForeground}
              maxLength={80}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Subtitle *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="One-line hook for your bootcamp"
              placeholderTextColor={colors.mutedForeground}
              maxLength={120}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What will students learn? What are the prerequisites?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
            />
          </View>

          <PickerRow label="Track" options={TRACKS} value={track} onChange={setTrack} colors={colors} />
          <PickerRow
            label="Difficulty"
            options={DIFFICULTIES}
            value={difficulty}
            onChange={setDifficulty}
            colors={colors}
          />
          <PickerRow
            label="Delivery Medium"
            options={DELIVERY_MEDIUMS}
            value={deliveryMedium}
            onChange={setDeliveryMedium}
            colors={colors}
          />

          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>XP Reward</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={xpReward}
              onChangeText={setXpReward}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Pricing */}
          <View style={[styles.pricingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PRICING</Text>
            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Free Bootcamp</Text>
                <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Students enroll without payment</Text>
              </View>
              <Switch
                value={isFree}
                onValueChange={setIsFree}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            {!isFree && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Price (₦)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.priceHint, { color: colors.mutedForeground }]}>
                  You can still mark individual modules as free previews
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22, minWidth: 80, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  coverImage: { width: "100%", height: 200, backgroundColor: "#1A1A1A" },
  coverPlaceholder: {
    height: 180, alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
  },
  coverPlaceholderText: { fontSize: 14, fontWeight: "600" },
  coverPlaceholderHint: { fontSize: 11 },
  coverOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 48,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  coverOverlayBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  coverOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  fields: { padding: 16, gap: 18 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  pricingCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { fontSize: 14, fontWeight: "600" },
  switchSub: { fontSize: 12, marginTop: 1 },
  priceHint: { fontSize: 11, marginTop: 6 },
  content: { paddingBottom: 40 },
});
