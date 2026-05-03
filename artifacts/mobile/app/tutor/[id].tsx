import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

export default function TutorBootcampScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.foreground }]}>Tutor Studio</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Manage your bootcamp, room, modules, and fees.</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Bootcamp ID</Text>
        <Text style={[styles.cardValue, { color: colors.mutedForeground }]}>{id}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>What you can manage</Text>
        <Text style={[styles.cardValue, { color: colors.mutedForeground }]}>• Modules and lessons</Text>
        <Text style={[styles.cardValue, { color: colors.mutedForeground }]}>• Students and progress</Text>
        <Text style={[styles.cardValue, { color: colors.mutedForeground }]}>• Pricing and fee settings</Text>
        <Text style={[styles.cardValue, { color: colors.mutedForeground }]}>• Bootcamp room setup</Text>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.push("/tutor/create")}>
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.buttonText}>Create another bootcamp</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  cardValue: { fontSize: 13 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});