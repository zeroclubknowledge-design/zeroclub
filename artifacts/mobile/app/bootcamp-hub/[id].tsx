import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function BootcampHubScreen() {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.foreground }]}>No bootcamp rooms</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>This bootcamp has no tutor admin, so there are no rooms to show.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  sub: { fontSize: 13, textAlign: "center" },
});
