import React, { useMemo } from "react";
import { View, Text, SectionList, StyleSheet, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { getListChannelsQueryOptions } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import type { Channel } from "@workspace/api-client-react";

type ExtChannel = Channel & {
  bootcampId?: string | null;
  parentChannelId?: string | null;
  title?: string | null;
};

interface Section {
  title: string;
  data: ExtChannel[];
}

export default function ChatScreen() {
  const colors = useColors();
  const { data: channels } = useQuery(getListChannelsQueryOptions());

  const sections = useMemo<Section[]>(() => {
    const all = (channels ?? []) as ExtChannel[];
    const communityChannels = all.filter((c) => !c.bootcampId && !c.parentChannelId);
    const bootcampRooms = all.filter((c) => c.bootcampId && !c.parentChannelId);
    const result: Section[] = [];
    if (communityChannels.length) result.push({ title: "Community", data: communityChannels });
    result.push({ title: "Bootcamp Rooms", data: bootcampRooms });
    return result;
  }, [channels]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Chat</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Community channels and bootcamp rooms.</Text>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
        )}
        renderItem={({ item, section }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(section.title === "Bootcamp Rooms" ? { pathname: "/bootcamp-hub/[id]", params: { id: item.id } } as never : `/channel/${item.id}`)}
          >
            <Feather name={section.title === "Bootcamp Rooms" ? "book-open" : "hash"} size={16} color={colors.primary} />
            <Text style={{ color: colors.foreground }}>{section.title === "Bootcamp Rooms" ? item.title ?? item.name : `#${item.name}`}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ color: colors.mutedForeground }}>No channels yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 14 },
  sectionTitle: { fontSize: 11, fontWeight: "700", marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
});