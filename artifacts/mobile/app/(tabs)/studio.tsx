import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useQuery } from "@tanstack/react-query";
import { getListBootcampsQueryOptions } from "@workspace/api-client-react";

export default function StudioScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: bootcamps, isLoading } = useQuery(getListBootcampsQueryOptions());
  const myBootcamps = (bootcamps ?? []).filter((b) => b.tutorId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Tutor Studio</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Create and manage your bootcamps here.</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.push("/tutor/create")}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.buttonText}>Create bootcamp</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your bootcamps</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : myBootcamps.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No bootcamps yet. Create one to see it here.</Text>
        ) : (
          <FlatList
            data={myBootcamps}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push({ pathname: "/tutor/[id]", params: { id: item.id } } as never)}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, gap: 10, borderBottomWidth: 1 },
  body: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  button: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignSelf: "flex-start" },
  buttonText: { color: "#fff", fontWeight: "700" },
  empty: { fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 13 },
});