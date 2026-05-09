import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@workspace/supabase";

type Message = {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
};

function timeStr(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const listRef = useRef<FlatList>(null);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const channelId = id ?? "";

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          author:profiles (*)
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      return (data || []).map((m: any) => ({
        ...m,
        createdAt: m.created_at,
        authorId: m.author_id,
        author: {
          ...m.author,
          avatarUrl: m.author.avatar_url,
          displayName: m.author.display_name,
        },
      }));
    },
    refetchInterval: 3000,
  });

  const { data: channel } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .single();
      if (error) return null;
      return data;
    },
  });

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessageText("");

    const newId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    const { error } = await supabase.from("messages").insert({
      id: newId,
      channel_id: channelId,
      author_id: user.id,
      body: text,
    });

    if (!error) {
      qc.invalidateQueries({ queryKey: ["messages", channelId] });
    }
  }, [messageText, channelId, user, qc]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.authorId === user?.id;
    const prevItem = index > 0 ? (messages ?? [])[index - 1] : null;
    const showAvatar = !prevItem || prevItem.authorId !== item.authorId;
    const createdAt =
      new Date(item.createdAt as string);

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                {item.author.avatarUrl ? (
                  <Image
                    source={{ uri: item.author.avatarUrl }}
                    style={StyleSheet.absoluteFillObject}
                    borderRadius={16}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.author.displayName[0]?.toUpperCase() ?? "?"}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.avatarSlotEmpty} />
            )}
          </View>
        )}
        <View style={{ maxWidth: "75%", gap: 3 }}>
          {!isMe && showAvatar && (
            <Text style={[styles.senderName, { color: colors.primary }]}>
              {item.author.displayName}
            </Text>
          )}
          <View
            style={[
              styles.bubbleContent,
              {
                backgroundColor: isMe ? colors.primary : colors.card,
                borderColor: colors.border,
                alignSelf: isMe ? "flex-end" : "flex-start",
              },
            ]}
          >
            <Text style={[styles.messageText, { color: isMe ? "#fff" : colors.foreground }]}>
              {item.body}
            </Text>
          </View>
          {showAvatar && (
            <Text
              style={[
                styles.messageTime,
                { color: colors.mutedForeground, textAlign: isMe ? "right" : "left" },
              ]}
            >
              {timeStr(createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.channelInfo}>
          <Text style={[styles.channelName, { color: colors.foreground }]} numberOfLines={1}>
            #{channel?.name ?? id}
          </Text>
          {channel?.description && (
            <Text style={[styles.channelDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
              {channel.description}
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Feather name="message-circle" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No messages yet. Say hi!
              </Text>
            </View>
          }
          renderItem={renderMessage}
        />
      )}

      {/* Input */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomInset + 8,
          },
        ]}
      >
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={`Message #${channel?.name ?? id}...`}
            placeholderTextColor={colors.mutedForeground}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: messageText.trim() ? colors.primary : colors.muted },
            ]}
            onPress={handleSend}
            disabled={!messageText.trim()}
            activeOpacity={0.8}
          >
            <Feather name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  channelInfo: { flex: 1 },
  channelName: { fontSize: 16, fontWeight: "700" },
  channelDesc: { fontSize: 12, marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  messageRowMe: { flexDirection: "row-reverse" },
  avatarSlot: { width: 32 },
  avatarSlotEmpty: { width: 32 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  senderName: { fontSize: 11, fontWeight: "700", paddingLeft: 2 },
  bubbleContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTime: { fontSize: 10, paddingLeft: 2 },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: { fontSize: 14 },
  inputBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: { flex: 1, fontSize: 14, maxHeight: 100, paddingVertical: 4 },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
