import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
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
import { useCreatePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

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

async function uploadMedia(uri: string, type: "image" | "video", token: string): Promise<string> {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  const baseUrl = domain ? `https://${domain}` : "";
  const filename = uri.split("/").pop() ?? "upload";
  const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
  const formData = new FormData();
  formData.append("file", { uri, name: filename, type: mimeType } as unknown as Blob);
  const res = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json() as { url: string };
  return `https://${domain}${data.url}`;
}

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { token, user } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

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

  const createPost = useCreatePost();
  const charCount = body.length;
  const maxChars = 500;

  const handlePickMedia = async (mediaType: "image" | "video") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow access to your photo library to attach media.");
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
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const baseUrl = domain ? `https://${domain}` : "";
      const res = await fetch(
        `${baseUrl}/api/profiles/search?q=${encodeURIComponent(q.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json() as TaggedUser[];
        setTagResults(
          data.filter((u) => u.id !== user?.id && !taggedUsers.find((t) => t.id === u.id)),
        );
      }
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
      Alert.alert("Empty post", "Write something first");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let mediaUrl: string | undefined;
    if (media && token) {
      setUploading(true);
      try {
        mediaUrl = await uploadMedia(media.uri, media.type, token);
      } catch {
        Alert.alert("Upload failed", "Could not upload media. Try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const mentions = taggedUsers.map((u) => `@${u.username}`).join(" ");
    const fullBody = mentions ? `${body.trim()}\n\n${mentions}` : body.trim();

    createPost.mutate(
      {
        data: {
          body: fullBody,
          track: track as import("@workspace/api-client-react").CreatePostRequestTrack,
          isProofProject: false,
          imageUrl: mediaUrl ?? null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPostsQueryKey({}) });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBody("");
          setMedia(null);
          setTaggedUsers([]);
          setSubmitted(true);
          setTimeout(() => setSubmitted(false), 3000);
        },
        onError: () => {
          Alert.alert("Error", "Failed to post. Try again.");
        },
      },
    );
  };

  const isPending = uploading || createPost.isPending;

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
        {submitted && (
          <View style={[styles.successBanner, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>
              Posted! +15 XP earned 🎉
            </Text>
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
          <Text
            style={[
              styles.charCount,
              { color: charCount > maxChars * 0.9 ? colors.destructive : colors.mutedForeground },
            ]}
          >
            {charCount}/{maxChars}
          </Text>
        </View>

        {/* Media preview */}
        {media && (
          <View style={[styles.mediaPreviewWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {media.type === "image" ? (
              <Image source={{ uri: media.uri }} style={styles.mediaPreview} resizeMode="cover" />
            ) : (
              <View style={[styles.videoPlaceholder, { backgroundColor: colors.muted }]}>
                <Feather name="film" size={32} color={colors.primary} />
                <Text style={[styles.videoLabel, { color: colors.mutedForeground }]}>Video selected</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.removeMedia, { backgroundColor: colors.card }]}
              onPress={() => setMedia(null)}
            >
              <Feather name="x" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Media attach buttons */}
        {!media && (
          <View style={styles.mediaRow}>
            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handlePickMedia("image")}
              activeOpacity={0.7}
            >
              <Feather name="image" size={18} color={colors.primary} />
              <Text style={[styles.mediaBtnText, { color: colors.mutedForeground }]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mediaBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handlePickMedia("video")}
              activeOpacity={0.7}
            >
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
              style={[
                styles.trackOption,
                {
                  backgroundColor: track === t.key ? colors.primary : colors.card,
                  borderColor: track === t.key ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.trackOptionText,
                  { color: track === t.key ? "#fff" : colors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tag People card */}
        <View style={[styles.tagCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tagCardHeader}>
            <View style={styles.tagLabelRow}>
              <Feather name="at-sign" size={16} color={colors.primary} />
              <Text style={[styles.tagLabel, { color: colors.foreground }]}>Tag People</Text>
            </View>
            <Text style={[styles.tagDesc, { color: colors.mutedForeground }]}>
              Tag builders who helped or inspired this build
            </Text>
          </View>

          {/* Tagged chips */}
          {taggedUsers.length > 0 && (
            <View style={styles.tagChips}>
              {taggedUsers.map((u) => (
                <View
                  key={u.id}
                  style={[styles.tagChip, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
                >
                  <View style={[styles.tagAvatar, { backgroundColor: colors.primary }]}>
                    {u.avatarUrl ? (
                      <Image
                        source={{ uri: u.avatarUrl }}
                        style={StyleSheet.absoluteFillObject}
                        borderRadius={10}
                      />
                    ) : (
                      <Text style={styles.tagAvatarText}>
                        {u.displayName.slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.tagChipText, { color: colors.primary }]}>
                    @{u.username}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(u.id)} activeOpacity={0.7}>
                    <Feather name="x" size={13} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.addTagBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => setTagModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={[styles.addTagText, { color: colors.primary }]}>
              {taggedUsers.length > 0 ? "Add more people" : "Tag a builder"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isPending ? colors.muted : colors.primary, opacity: isPending ? 0.7 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitText}>{uploading ? "Uploading..." : "Posting..."}</Text>
            </>
          ) : (
            <>
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.submitText}>Post to Feed</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Tag People Modal */}
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
              <TextInput
                style={[styles.modalSearchInput, { color: colors.foreground }]}
                placeholder="Search by name or @username..."
                placeholderTextColor={colors.mutedForeground}
                value={tagSearch}
                onChangeText={handleTagSearch}
                autoFocus
              />
              {tagSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            <FlatList
              data={tagResults}
              keyExtractor={(u) => u.id}
              style={styles.tagResultList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                tagSearch.trim() && !tagSearching ? (
                  <View style={styles.tagEmptyBox}>
                    <Text style={[styles.tagEmptyText, { color: colors.mutedForeground }]}>
                      No users found
                    </Text>
                  </View>
                ) : !tagSearch.trim() ? (
                  <View style={styles.tagEmptyBox}>
                    <Text style={[styles.tagEmptyText, { color: colors.mutedForeground }]}>
                      Type to search builders
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }: { item: TaggedUser }) => (
                <TouchableOpacity
                  style={[styles.tagResultRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleTagUser(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tagResultAvatar, { backgroundColor: colors.primary }]}>
                    {item.avatarUrl ? (
                      <Image
                        source={{ uri: item.avatarUrl }}
                        style={StyleSheet.absoluteFillObject}
                        borderRadius={18}
                      />
                    ) : (
                      <Text style={styles.tagAvatarText}>
                        {item.displayName.slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.tagResultInfo}>
                    <Text style={[styles.tagResultName, { color: colors.foreground }]}>
                      {item.displayName}
                    </Text>
                    <Text style={[styles.tagResultUsername, { color: colors.mutedForeground }]}>
                      @{item.username}
                    </Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.levelText, { color: colors.primary }]}>
                      Lv{item.level}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
