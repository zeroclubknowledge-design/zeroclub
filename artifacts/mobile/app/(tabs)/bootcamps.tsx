import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getListBootcampsQueryOptions, type Bootcamp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { BootcampCard } from "@/components/BootcampCard";

export default function BootcampsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: bootcamps, isLoading, refetch, isRefetching } = useQuery(
    getListBootcampsQueryOptions(),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Bootcamps</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Ship skills. Earn XP.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={bootcamps ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="book" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No bootcamps yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Check back soon or tap refresh
              </Text>
            </View>
          }
          renderItem={({ item }: { item: Bootcamp & { priceCents?: number } }) => (
            <BootcampCard
              {...item}
              priceCents={item.priceCents ?? 0}
              progress={item.enrollment?.progress ?? 0}
              onPress={() => router.push(`/bootcamp/${item.id}`)}
              onEnroll={() => router.push(`/bootcamp/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, marginTop: 2 },
  list: { paddingTop: 12, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySub: { fontSize: 14 },
});
