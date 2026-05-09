import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { supabase } from "@workspace/supabase";
import { decode } from "base64-arraybuffer";
import { readAsStringAsync } from "expo-file-system";
import { Video, ResizeMode } from "expo-av";
const TRACKS = [
  { key: "product_design", label: "Product Design" },
  { key: "frontend", label: "Frontend" },
  { key: "growth", label: "Growth" },
  { key: "branding", label: "Branding" },
  { key: "mentorship", label: "Mentorship" },
  { key: "backend", label: "Backend" },
  { key: "full_stack", label: "Full Stack" },
  { key: "vibe_coding", label: "Vibe Coding" },
  { key: "video_editing", label: "Video Editing" },
  { key: "motion_design", label: "Motion Design" },
];

interface MediaAsset {
  uri: string;
  type: "image" | "video";
}

interface TaggedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  level: number;
}

async function uploadMedia(uri: string, type: "image" | "video"): Promise<string> {
  const ext = uri.split(".").pop()?.split("?")[0] ?? (type === "video" ? "mp4" : "jpg");
  const filename = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  
  let arrayBuffer: ArrayBuffer;
  let contentType: string;

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    arrayBuffer = await blob.arrayBuffer();
    contentType = blob.type || (type === "video" ? "video/mp4" : "image/jpeg");
  } else {
    const base64 = await readAsStringAsync(uri, { encoding: "base64" });
    arrayBuffer = decode(base64);
    contentType = type === "video" ? "video/mp4" : "image/jpeg";
  }

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(filename, arrayBuffer, { contentType, cacheControl: "3600", upsert: false });

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(data.path);
  return publicUrl;
}

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { token, user } = useAuth();
  const { isDesktop } = useBreakpoint();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 0 : 16) : insets.top;
  const bottomPadding = Platform.OS === "web" ? (isDesktop ? 40 : 34 + 84) : insets.bottom + 60;

  const [body, setBody] = useState("");
  const [track, setTrack] = useState("frontend");
  const [submitted, setSubmitted] = useState(false);
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [tagModal, setTagModal] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagResults, setTagResults] = useState<TaggedUser[]>([]);
  const [tagSearching, setTagSearching] = useState(false);

  const { showToast } = useToast();
  const [isPosting, setIsPosting] = useState(false);
  const charCount = body.length;
  const maxChars = 500;

  const handlePickMedia = async (mediaType: "image" | "video") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ type: "warning", title: "Permission needed", message: "Allow access to your photo library to attach media." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === "image"
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      allowsEditing: mediaType === "image",
      videoMaxDuration: 120,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia({ uri: result.assets[0].uri, type: mediaType });
    }
  };

  const handleTagSearch = async (q: string) => {
    setTagSearch(q);
    if (!q.trim() || !token) {
      setTagResults([]);
      return;
    }
    setTagSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(10);

      if (error) throw error;
      setTagResults(
        (data || []).filter((u) => u.id !== user?.id && !taggedUsers.find((t) => t.id === u.id)) as TaggedUser[],
      );
    } catch {
      setTagResults([]);
    } finally {
      setTagSearching(false);
    }
  };

  const handleTagUser = (u: TaggedUser) => {
    setTaggedUsers((prev) => [...prev, u]);
    setTagResults((prev) => prev.filter((r) => r.id !== u.id));
    setTagSearch("");
    setTagModal(false);
  };

  const handleRemoveTag = (id: string) => {
    setTaggedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSubmit = async () => {
    if (!body.trim()) {
      showToast({ type: "warning", title: "Empty post", message: "Write something first" });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let mediaUrl: string | undefined;
    if (media) {
      setUploading(true);
      try {
        mediaUrl = await uploadMedia(media.uri, media.type);
      } catch (err: any) {
        console.error(err);
        showToast({ 
          type: "error", 
          title: "Upload failed", 
          message: err.message || "Could not upload media." 
        });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setIsPosting(true);
    try {
      const mentions = taggedUsers.map((u) => `@${u.username}`).join(" ");
      const fullBody = mentions ? `${body.trim()}\n\n${mentions}` : body.trim();

      // 1. Insert the post
      const { error: postError } = await supabase.from("posts").insert({
        author_id: user?.id,
        body: fullBody,
        track,
        image_url: mediaUrl,
        is_proof_project: false,
        xp_awarded: 15,
        proof_click_count: 0,
      });

      if (postError) throw postError;

      // 2. Increment user XP in profiles table
      if (user?.id) {
        await supabase.rpc("increment_xp", { x: 15, user_id: user.id });
      }

      // 3. Refresh and Navigate
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["feed-summary"] });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ type: "success", title: "Posted!", message: "+15 XP earned 🎉" });
      
      // Navigate back to feed
      const { router } = require("expo-router");
      router.replace("/(tabs)");
      
      setBody("");
      setMedia(null);
      setTaggedUsers([]);
    } catch (err: any) {
      console.error(err);
      showToast({ type: "error", title: "Failed to post", message: err?.message || "Try again." });
    } finally {
      setIsPosting(false);
    }
  };

  const isPending = uploading || isPosting;

  const formContent = (
    <>
        {submitted && (
          <View style={[styles.successBanner, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>Posted! +15 XP earned 🎉</Text>
          </View>
        )}

        {/* Text area */}
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="What are you building? Share your progress..."
            placeholderTextColor={colors.mutedForeground}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={maxChars}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: charCount > maxChars * 0.9 ? colors.destructive : colors.mutedForeground }]}>
            {charCount}/{maxChars}
          </Text>
        </View>

        {/* Media preview */}
        {media && (
          <View style={[styles.mediaPreviewWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {media.type === "image" ? (
              <Image source={{ uri: media.uri }} style={styles.mediaPreview} resizeMode="cover" />
            ) : (
              <Video
                source={{ uri: media.uri }}
                style={styles.mediaPreview}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isMuted
                isLooping
                useNativeControls={false}
              />
            )}
            <TouchableOpacity style={[styles.removeMedia, { backgroundColor: colors.card }]} onPress={() => setMedia(null)}>
              <Feather name="x" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Media attach buttons */}
        {!media && (
          <View style={styles.mediaRow}>
            <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handlePickMedia("image")} activeOpacity={0.7}>
              <Feather name="image" size={18} color={colors.primary} />
              <Text style={[styles.mediaBtnText, { color: colors.mutedForeground }]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handlePickMedia("video")} activeOpacity={0.7}>
              <Feather name="video" size={18} color={colors.primary} />
              <Text style={[styles.mediaBtnText, { color: colors.mutedForeground }]}>Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Track selector */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Track</Text>
        <View style={styles.trackGrid}>
          {TRACKS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTrack(t.key)}
              style={[styles.trackOption, { backgroundColor: track === t.key ? colors.primary : colors.card, borderColor: track === t.key ? colors.primary : colors.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.trackOptionText, { color: track === t.key ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tag People */}
        <View style={[styles.tagCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tagCardHeader}>
            <View style={styles.tagLabelRow}>
              <Feather name="at-sign" size={16} color={colors.primary} />
              <Text style={[styles.tagLabel, { color: colors.foreground }]}>Tag People</Text>
            </View>
            <Text style={[styles.tagDesc, { color: colors.mutedForeground }]}>Tag builders who helped or inspired this build</Text>
          </View>
          {taggedUsers.length > 0 && (
            <View style={styles.tagChips}>
              {taggedUsers.map((u) => (
                <View key={u.id} style={[styles.tagChip, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
                  <View style={[styles.tagAvatar, { backgroundColor: colors.primary }]}>
                    {u.avatarUrl ? (
                      <Image source={{ uri: u.avatarUrl }} style={StyleSheet.absoluteFillObject} borderRadius={10} />
                    ) : (
                      <Text style={styles.tagAvatarText}>{u.displayName.slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={[styles.tagChipText, { color: colors.primary }]}>@{u.username}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(u.id)} activeOpacity={0.7}>
                    <Feather name="x" size={13} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity style={[styles.addTagBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={() => setTagModal(true)} activeOpacity={0.8}>
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={[styles.addTagText, { color: colors.primary }]}>{taggedUsers.length > 0 ? "Add more people" : "Tag a builder"}</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isPending ? colors.muted : colors.primary, opacity: isPending ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <><ActivityIndicator size="small" color="#fff" /><Text style={styles.submitText}>{uploading ? "Uploading..." : "Posting..."}</Text></>
          ) : (
            <><Feather name="send" size={16} color="#fff" /><Text style={styles.submitText}>Post to Feed</Text></>
          )}
        </TouchableOpacity>
    </>
  );

  const tagModal_ = (
      <Modal visible={tagModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Tag People</Text>
              <TouchableOpacity onPress={() => { setTagModal(false); setTagSearch(""); setTagResults([]); }}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput style={[styles.modalSearchInput, { color: colors.foreground }]} placeholder="Search by name or @username..." placeholderTextColor={colors.mutedForeground} value={tagSearch} onChangeText={handleTagSearch} autoFocus />
              {tagSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            <FlatList
              data={tagResults}
              keyExtractor={(u) => u.id}
              style={styles.tagResultList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                tagSearch.trim() && !tagSearching ? (
                  <View style={styles.tagEmptyBox}><Text style={[styles.tagEmptyText, { color: colors.mutedForeground }]}>No users found</Text></View>
                ) : !tagSearch.trim() ? (
                  <View style={styles.tagEmptyBox}><Text style={[styles.tagEmptyText, { color: colors.mutedForeground }]}>Type to search builders</Text></View>
                ) : null
              }
              renderItem={({ item }: { item: TaggedUser }) => (
                <TouchableOpacity style={[styles.tagResultRow, { borderBottomColor: colors.border }]} onPress={() => handleTagUser(item)} activeOpacity={0.8}>
                  <View style={[styles.tagResultAvatar, { backgroundColor: colors.primary }]}>
                    {item.avatarUrl ? <Image source={{ uri: item.avatarUrl }} style={StyleSheet.absoluteFillObject} borderRadius={18} /> : <Text style={styles.tagAvatarText}>{item.displayName.slice(0, 1).toUpperCase()}</Text>}
                  </View>
                  <View style={styles.tagResultInfo}>
                    <Text style={[styles.tagResultName, { color: colors.foreground }]}>{item.displayName}</Text>
                    <Text style={[styles.tagResultUsername, { color: colors.mutedForeground }]}>@{item.username}</Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.levelText, { color: colors.primary }]}>Lv{item.level}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
  );

  // ── Desktop Layout ──
  if (isDesktop) {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.desktopTopBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <View>
            <Text style={[styles.desktopPageTitle, { color: colors.foreground }]}>New Post</Text>
            <Text style={[styles.desktopPageSub, { color: colors.mutedForeground }]}>Share your build with the community</Text>
          </View>
          <View style={[styles.xpBadge, { backgroundColor: colors.xpGold + "22" }]}>
            <Feather name="zap" size={14} color={colors.xpGold} />
            <Text style={[styles.xpHint, { color: colors.xpGold }]}>+15 XP when you post</Text>
          </View>
        </View>
        <View style={styles.desktopBody}>
          <ScrollView style={styles.desktopFormCol} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {formContent}
          </ScrollView>
          <View style={[styles.desktopTipsCol, { borderLeftColor: colors.border }]}>
            <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Tips for a great post</Text>
              {[
                { icon: "zap" as const, color: colors.xpGold, text: "Show your progress, not just the end result" },
                { icon: "users" as const, color: colors.primary, text: "Tag builders who inspired or helped you" },
                { icon: "image" as const, color: "#10B981", text: "Add a screenshot or demo video" },
                { icon: "award" as const, color: "#8B5CF6", text: "Pick the right track so the right people see it" },
              ].map((tip) => (
                <View key={tip.text} style={styles.tipRow}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.color + "20" }]}>
                    <Feather name={tip.icon} size={13} color={tip.color} />
                  </View>
                  <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip.text}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>XP Rewards</Text>
              {[
                { label: "Post a build", xp: "+15 XP" },
                { label: "Someone likes it", xp: "+2 XP" },
                { label: "Mark as proof project", xp: "+10 XP" },
                { label: "10 proof clicks", xp: "2× boost" },
              ].map((r) => (
                <View key={r.label} style={styles.xpRow}>
                  <Text style={[styles.xpRowLabel, { color: colors.mutedForeground }]}>{r.label}</Text>
                  <Text style={[styles.xpRowValue, { color: colors.xpGold }]}>{r.xp}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        {tagModal_}
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile Layout ──
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Post</Text>
        <View style={[styles.xpBadge, { backgroundColor: colors.xpGold + "22" }]}>
          <Feather name="zap" size={12} color={colors.xpGold} />
          <Text style={[styles.xpHint, { color: colors.xpGold }]}>+15 XP</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formContent}
      </ScrollView>
      {tagModal_}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  xpHint: { fontSize: 13, fontWeight: "700" },

  // Desktop
  desktopTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  desktopPageTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  desktopPageSub: { fontSize: 13, marginTop: 2 },
  desktopBody: { flex: 1, flexDirection: "row" },
  desktopFormCol: { flex: 1, maxWidth: 680 },
  desktopTipsCol: { width: 280, borderLeftWidth: 1, padding: 20, gap: 16 },
  tipsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  tipsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  xpRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  xpRowLabel: { fontSize: 13 },
  xpRowValue: { fontSize: 13, fontWeight: "700" },
  content: { padding: 16, gap: 14 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  successText: { fontSize: 14, fontWeight: "600" },
  inputCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  textInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    fontFamily: "Inter_400Regular",
  },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 6 },
  mediaRow: { flexDirection: "row", gap: 10 },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  mediaBtnText: { fontSize: 14, fontWeight: "600" },
  mediaPreviewWrap: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  mediaPreview: { width: "100%", height: 200 },
  videoPlaceholder: { height: 140, alignItems: "center", justifyContent: "center", gap: 8 },
  videoLabel: { fontSize: 13, fontWeight: "500" },
  removeMedia: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: -6,
  },
  trackGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trackOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  trackOptionText: { fontSize: 13, fontWeight: "600" },
  tagCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  tagCardHeader: { gap: 4 },
  tagLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tagLabel: { fontSize: 15, fontWeight: "600" },
  tagDesc: { fontSize: 12, lineHeight: 16 },
  tagChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tagAvatarText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  tagChipText: { fontSize: 12, fontWeight: "600" },
  addTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  addTagText: { fontSize: 13, fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 14 },
  tagResultList: { maxHeight: 300 },
  tagResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tagResultInfo: { flex: 1 },
  tagResultName: { fontSize: 14, fontWeight: "600" },
  tagResultUsername: { fontSize: 12, marginTop: 1 },
  levelBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontSize: 10, fontWeight: "700" },
  tagEmptyBox: { paddingVertical: 24, alignItems: "center" },
  tagEmptyText: { fontSize: 13 },
});
