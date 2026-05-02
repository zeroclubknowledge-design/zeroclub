import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile } from "@/context/AuthContext";

const LOGO = require("../assets/images/icon.png");

const TRACKS = [
  { key: "product_design", label: "Product Design" },
  { key: "frontend", label: "Frontend" },
  { key: "growth", label: "Growth" },
  { key: "branding", label: "Branding" },
  { key: "mentorship", label: "Mentorship" },
  { key: "backend", label: "Backend" },
  { key: "full_stack", label: "Full Stack" },
  { key: "vibe_coding", label: "Vibe Coding" },
  { key: "video_editing", label: "Video Editing" },
  { key: "motion_design", label: "Motion Design" },
];

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [track, setTrack] = useState("frontend");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleRegister = async () => {
    if (!email || !password || !username || !displayName) {
      Alert.alert("Missing fields", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const baseUrl = domain ? `https://${domain}` : "";
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          username,
          displayName,
          track,
          school: school.trim() || undefined,
          referralCode: referralCode.trim().toUpperCase() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Registration failed", data.message ?? "Something went wrong");
        return;
      }
      await login(data.token, data.user as UserProfile);
      router.replace("/(tabs)" as never);
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
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
          { paddingTop: topPadding + 20, paddingBottom: bottomPadding + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.heroSection}>
          <Image source={LOGO} style={styles.logo} />
          <Text style={[styles.title, { color: colors.foreground }]}>Join Zero Club</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Your builder journey starts here.
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            icon="user"
            placeholder="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            colors={colors}
          />
          <InputField
            icon="at-sign"
            placeholder="Username"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ""))}
            colors={colors}
            autoCapitalize="none"
          />
          <InputField
            icon="mail"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            colors={colors}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            icon="map-pin"
            placeholder="School name (e.g. Kings College Lagos)"
            value={school}
            onChangeText={setSchool}
            colors={colors}
          />
          <InputField
            icon="gift"
            placeholder="Referral code (optional)"
            value={referralCode}
            onChangeText={(t) => setReferralCode(t.toUpperCase())}
            colors={colors}
            autoCapitalize="none"
          />
          <View
            style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password (8+ chars)"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {/* Track */}
          <Text style={[styles.trackLabel, { color: colors.mutedForeground }]}>
            Your Track
          </Text>
          <View style={styles.trackGrid}>
            {TRACKS.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTrack(t.key)}
                style={[
                  styles.trackOption,
                  {
                    backgroundColor: track === t.key ? colors.primary : colors.card,
                    borderColor: track === t.key ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.trackText,
                    { color: track === t.key ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? "Creating account..." : "Join the Club"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: colors.mutedForeground }]}>
            Already a member?
          </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={[styles.loginLink, { color: colors.primary }]}> Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type Colors = {
  card: string;
  border: string;
  mutedForeground: string;
  foreground: string;
};

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  colors,
  keyboardType,
  autoCapitalize,
}: {
  icon: keyof typeof Feather.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  colors: Colors;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <TextInput
        style={[styles.input, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
  },
  form: { gap: 10 },
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
  trackLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  trackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trackOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  trackText: {
    fontSize: 12,
    fontWeight: "600",
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: { fontSize: 14 },
  loginLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
