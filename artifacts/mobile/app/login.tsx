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

type Role = "student" | "tutor";

const ROLES: {
  key: Role;
  label: string;
  tagline: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  perks: string[];
}[] = [
  {
    key: "student",
    label: "Student",
    tagline: "Learn & level up",
    icon: "book-open",
    accent: "#D4387C",
    perks: ["Join bootcamps", "Earn XP & level up", "Connect with builders"],
  },
  {
    key: "tutor",
    label: "Tutor",
    tagline: "Teach & earn",
    icon: "tv",
    accent: "#6366F1",
    perks: ["Create bootcamps", "Manage students", "Earn revenue"],
  },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const accent = role === "tutor" ? "#6366F1" : colors.primary;

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
      const data = await res.json() as { token?: string; user?: UserProfile; message?: string };
      if (!res.ok) {
        showToast({ type: "error", title: "Sign in failed", message: data.message ?? "Invalid credentials" });
        return;
      }
      await login(data.token!, data.user as UserProfile);

      const isTutorAccount = (data.user as UserProfile)?.tutorVerified ?? 0;

      if (role === "tutor" && isTutorAccount < 1) {
        showToast({
          type: "warning",
          title: "Tutor access pending",
          message: "Your tutor account is under review. You can still browse as a student.",
        });
        router.replace("/(tabs)" as never);
      } else if (role === "tutor" && isTutorAccount >= 1) {
        showToast({ type: "success", title: "Welcome back!", message: "Opening your Tutor Studio…" });
        router.replace("/(tabs)/studio" as never);
      } else {
        router.replace("/(tabs)" as never);
      }
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
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 32, paddingBottom: bottomPadding + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.appName, { color: colors.foreground }]}>Zero Club</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>A private club for builders.</Text>
        </View>

        {/* Role selector */}
        <View style={styles.roleSection}>
          <Text style={[styles.roleSectionLabel, { color: colors.mutedForeground }]}>I'M SIGNING IN AS</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: active ? r.accent + "18" : colors.card,
                      borderColor: active ? r.accent : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleIconWrap, { backgroundColor: active ? r.accent + "25" : colors.muted }]}>
                    <Feather name={r.icon} size={20} color={active ? r.accent : colors.mutedForeground} />
                  </View>
                  <Text style={[styles.roleLabel, { color: active ? r.accent : colors.foreground }]}>{r.label}</Text>
                  <Text style={[styles.roleTagline, { color: colors.mutedForeground }]}>{r.tagline}</Text>
                  {active && (
                    <View style={[styles.checkBadge, { backgroundColor: r.accent }]}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

          <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: loading ? colors.muted : accent }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading ? "Signing in…" : `Sign in as ${role === "tutor" ? "Tutor" : "Student"}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Not a member?</Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={[styles.switchLink, { color: accent }]}>{" "}Join the Club</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 28 },
  logoRow: { alignItems: "center", gap: 8 },
  logo: { width: 68, height: 68, borderRadius: 18 },
  appName: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 14 },
  roleSection: { gap: 12 },
  roleSectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: {
    flex: 1, borderRadius: 16, borderWidth: 1.5,
    padding: 14, gap: 5, alignItems: "center", position: "relative",
  },
  roleIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  roleLabel: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  roleTagline: { fontSize: 11, textAlign: "center" },
  checkBadge: {
    position: "absolute", top: 10, right: 10,
    width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center",
  },
  form: { gap: 12 },
  inputGroup: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  switchText: { fontSize: 14 },
  switchLink: { fontSize: 14, fontWeight: "700" },
});
