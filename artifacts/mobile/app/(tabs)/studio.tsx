import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function StudioScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.foreground }]}>Tutor Studio</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Create and manage your bootcamps here.</Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.push("/tutor")}> 
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.buttonText}>Create bootcamp</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 14, textAlign: "center" },
  button: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: "#fff", fontWeight: "700" },
});