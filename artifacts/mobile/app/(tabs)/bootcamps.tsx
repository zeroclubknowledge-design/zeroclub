import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getListBootcampsQueryOptions } from "@workspace/api-client-react";
import type { Bootcamp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { BootcampCard } from "@/components/BootcampCard";

export default function BootcampsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const { data: bootcamps, isLoading } = useQuery(getListBootcampsQueryOptions());

  const list = bootcamps ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Bootcamps</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Bootcamp }) => (
            <BootcampCard
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              track={item.track}
              difficulty={item.difficulty}
              deliveryMedium={item.deliveryMedium ?? undefined}
              coverUrl={item.coverUrl}
              modulesCount={item.modulesCount}
              xpReward={item.xpReward}
              priceCents={item.priceCents}
              enrolled={item.enrolled}
              progress={item.enrollment?.progress ?? 0}
              onPress={() => router.push({ pathname: "/bootcamp/[id]", params: { id: item.id } } as never)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="book-open" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bootcamps yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Check back soon for new learning tracks.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});