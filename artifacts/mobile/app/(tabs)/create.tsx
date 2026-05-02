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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useCreatePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const TRACKS = [
  { key: "product_design", label: "Product Design" },
  { key: "frontend", label: "Frontend" },
  { key: "growth", label: "Growth" },
  { key: "branding", label: "Branding" },
  { key: "mentorship", label: "Mentorship" },
];

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const [body, setBody] = useState("");
  const [track, setTrack] = useState("frontend");
  const [isProofProject, setIsProofProject] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const createPost = useCreatePost();
  const charCount = body.length;
  const maxChars = 500;

  const handleSubmit = async () => {
    if (!body.trim()) {
      Alert.alert("Empty post", "Write something first");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPost.mutate(
      { data: { body: body.trim(), track: track as import("@workspace/api-client-react").CreatePostRequestTrack, isProofProject } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPostsQueryKey({}) });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBody("");
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
        <View
          style={[
            styles.inputCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
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
        <View
          style={[
            styles.proofRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.proofInfo}>
            <View style={styles.proofLabelRow}>
              <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.proofLabel, { color: colors.foreground }]}>
                Proof Project
              </Text>
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
            {
              backgroundColor: createPost.isPending ? colors.muted : colors.primary,
              opacity: createPost.isPending ? 0.7 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={createPost.isPending}
          activeOpacity={0.85}
        >
          {createPost.isPending ? (
            <Text style={styles.submitText}>Posting...</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  xpHint: {
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  successText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    fontFamily: "Inter_400Regular",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: -6,
  },
  trackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trackOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  trackOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  proofInfo: {
    flex: 1,
    gap: 4,
  },
  proofLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  proofLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  proofDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
