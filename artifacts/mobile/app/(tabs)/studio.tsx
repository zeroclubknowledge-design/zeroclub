import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function StudioScreen() {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>Tutor rooms are only available for real tutor-owned bootcamps.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  text: { fontSize: 13 },
});
