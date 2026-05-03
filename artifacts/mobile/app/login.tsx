import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { UserProfile } from "@/context/AuthContext";

const LOGO = require("../assets/images/icon.png");

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = async () => {
    if (!email || !password) {
      showToast({ type: "warning", title: "Missing fields", message: "Please fill in all fields" });
      return;
    }
    setLoading(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const baseUrl = domain ? `https://${domain}` : "";
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: "error", title: "Login failed", message: data.message ?? "Invalid credentials" });
        return;
      }
      await login(data.token, data.user as UserProfile);
      router.replace("/(tabs)" as never);
    } catch {
      showToast({ type: "error", title: "Network error", message: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 40, paddingBottom: bottomPadding + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + Title */}
        <View style={styles.heroSection}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.title, { color: colors.foreground }]}>Zero Club</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            A private club for builders.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View
            style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View
            style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? "Signing in..." : "Sign In"}</Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: colors.mutedForeground }]}>
            Not a member?
          </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>
              {" "}Join the Club
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
