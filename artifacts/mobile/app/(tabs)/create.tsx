import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
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
  const { token } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const [body, setBody] = useState("");
  const [track, setTrack] = useState("frontend");
  const [isProofProject, setIsProofProject] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);

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

    createPost.mutate(
      {
        data: {
          body: body.trim(),
          track: track as import("@workspace/api-client-react").CreatePostRequestTrack,
          isProofProject,
          imageUrl: mediaUrl ?? null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPostsQueryKey({}) });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBody("");
          setMedia(null);
          setIsProofProject(false);
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
        <Text style={[styles.xpHint, { color: colors.primary }]}>
          +{isProofProject ? 50 : 15} XP
        </Text>
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
              Posted! +{isProofProject ? 50 : 15} XP earned
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
                <Text style={[styles.videoLabel, { color: colors.mutedForeground }]}>
                  Video selected
                </Text>
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

        {/* Proof Project toggle */}
        <View style={[styles.proofRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.proofInfo}>
            <View style={styles.proofLabelRow}>
              <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.proofLabel, { color: colors.foreground }]}>Proof Project</Text>
            </View>
            <Text style={[styles.proofDesc, { color: colors.mutedForeground }]}>
              Mark this as a completed build for +50 XP (vs +15 XP)
            </Text>
          </View>
          <Switch
            value={isProofProject}
            onValueChange={setIsProofProject}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
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
  xpHint: { fontSize: 16, fontWeight: "700" },
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
  videoPlaceholder: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
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
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  proofInfo: { flex: 1, gap: 4 },
  proofLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  proofLabel: { fontSize: 15, fontWeight: "600" },
  proofDesc: { fontSize: 12, lineHeight: 16 },
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
});
