import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useShare } from "@/hooks/useShare";

interface SubChannel {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
}

const SUB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  general: "hash",
  "show-and-tell": "monitor",
  resources: "link",
  feedback: "message-square",
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function BootcampHubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, bootcampTitle } = useLocalSearchParams<{
    id: string;
    bootcampTitle?: string;
  }>();
  const { token } = useAuth();
  const { shareBootcamp } = useShare();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const [subs, setSubs] = React.useState<SubChannel[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id || !token) return;
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const baseUrl = domain ? `https://${domain}` : "";
    fetch(`${baseUrl}/api/channels/${id}/sub-channels`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: SubChannel[]) => setSubs(data))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, [id, token]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {bootcampTitle ?? "Bootcamp"}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {subs.length} channel{subs.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bootcampBadge, { backgroundColor: colors.primary + "22" }]}
          onPress={() => void shareBootcamp(id ?? "", bootcampTitle ?? "this Bootcamp")}
          activeOpacity={0.75}
        >
          <Feather name="share-2" size={15} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={subs}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.intro, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={18} color={colors.primary} />
              <Text style={[styles.introText, { color: colors.mutedForeground }]}>
                This is the community space for this bootcamp. Join any channel to discuss, share, and learn with your cohort.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = SUB_ICONS[item.name] ?? "hash";
            const lastAt = item.lastMessageAt as string | null | undefined;
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() =>
                  router.push({
                    pathname: "/channel/[id]",
                    params: { id: item.id },
                  } as never)
                }
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name={icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.rowInfo}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                      #{item.title ?? item.name}
                    </Text>
                    {lastAt && (
                      <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>
                        {timeAgo(lastAt)}
                      </Text>
                    )}
                  </View>
                  {item.description && (
                    <Text
                      style={[styles.rowDesc, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  )}
                  {item.lastMessage && (
                    <Text
                      style={[styles.lastMsg, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
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
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, marginTop: 1 },
  bootcampBadge: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  intro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  introText: { flex: 1, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowTime: { fontSize: 11 },
  rowDesc: { fontSize: 12 },
  lastMsg: { fontSize: 12, fontStyle: "italic" },
});
