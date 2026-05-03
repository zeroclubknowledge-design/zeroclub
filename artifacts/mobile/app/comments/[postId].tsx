import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListCommentsQueryOptions,
  getListCommentsQueryKey,
  useCreateComment,
  getListPostsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    level: number;
  };
}

export default function CommentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const { showToast } = useToast();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const { data: comments, isLoading } = useQuery(
    getListCommentsQueryOptions(postId ?? ""),
  );

  const createComment = useCreateComment();

  const handleSend = () => {
    if (!text.trim() || !postId) return;
    const body = text.trim();
    setText("");
    createComment.mutate(
      { postId, data: { body } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
          qc.invalidateQueries({ queryKey: getListPostsQueryKey({}) });
        },
        onError: () => {
          showToast({ type: "error", title: "Could not post comment" });
          setText(body);
        },
      },
    );
  };

  const initials = (name: string) => name.slice(0, 1).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Comments{comments?.length ? ` (${comments.length})` : ""}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Comments list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={(comments ?? []) as Comment[]}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No comments yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Be the first to drop a comment
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Comment }) => (
            <View
              style={[
                styles.commentRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/user/[id]",
                    params: { id: item.author.id },
                  } as never)
                }
                activeOpacity={0.8}
              >
                <View
                  style={[styles.avatar, { backgroundColor: colors.primary }]}
                >
                  {item.author.avatarUrl ? (
                    <Image
                      source={{ uri: item.author.avatarUrl }}
                      style={StyleSheet.absoluteFillObject}
                      borderRadius={18}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {initials(item.author.displayName)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.commentContent}>
                <View style={styles.commentMeta}>
                  <Text
                    style={[styles.commentName, { color: colors.foreground }]}
                  >
                    {item.author.displayName}
                  </Text>
                  <View
                    style={[
                      styles.levelBadge,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Text
                      style={[styles.levelText, { color: colors.primary }]}
                    >
                      Lv{item.author.level}
                    </Text>
                  </View>
                  <Text
                    style={[styles.commentTime, { color: colors.mutedForeground }]}
                  >
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.commentBody, { color: colors.foreground }]}>
                  {item.body}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <View
          style={[
            styles.avatarSmall,
            { backgroundColor: colors.primary },
          ]}
        >
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={StyleSheet.absoluteFillObject}
              borderRadius={16}
            />
          ) : (
            <Text style={styles.avatarSmallText}>
              {initials(user?.displayName ?? "U")}
            </Text>
          )}
        </View>

        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              backgroundColor: colors.muted,
              color: colors.foreground,
              borderColor: colors.border,
            },
          ]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                text.trim() && !createComment.isPending
                  ? colors.primary
                  : colors.muted,
            },
          ]}
          onPress={handleSend}
          disabled={!text.trim() || createComment.isPending}
          activeOpacity={0.85}
        >
          {createComment.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather
              name="send"
              size={15}
              color={text.trim() ? "#fff" : colors.mutedForeground}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 8 },
  commentRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  commentContent: { flex: 1, gap: 4 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  commentName: { fontSize: 13, fontWeight: "700" },
  levelBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  levelText: { fontSize: 9, fontWeight: "700" },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 8 },
  emptySub: { fontSize: 13 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    marginBottom: 2,
  },
  avatarSmallText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
});
