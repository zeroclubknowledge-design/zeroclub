import React, { useState, useEffect } from "react";
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
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { UserProfile } from "@/context/AuthContext";
import { consumePendingRef, consumePendingRedirect } from "@/hooks/useShare";
import { supabase } from "@workspace/supabase";

const LOGO = require("../assets/images/icon.png");

type Role = "student" | "tutor";

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

const ROLE_DATA: {
  key: Role;
  label: string;
  tagline: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  perks: string[];
}[] = [
  {
    key: "student",
    label: "Student",
    tagline: "I want to learn",
    description: "Join bootcamps, earn XP, share your builds, and connect with Africa's best builders.",
    icon: "book-open",
    accent: "#D4387C",
    perks: ["Access all bootcamps", "Earn XP & level up", "Real-time community chat", "Proof-of-work feed"],
  },
  {
    key: "tutor",
    label: "Tutor",
    tagline: "I want to teach",
    description: "Create bootcamps, manage your students, set your pricing, and earn from your knowledge.",
    icon: "tv",
    accent: "#6366F1",
    perks: ["Create & sell bootcamps", "Per-module free previews", "Student progress tracking", "Community channels"],
  },
];

type Colors = ReturnType<typeof useColors>;

function InputField({
  icon, placeholder, value, onChangeText, colors, accent,
  keyboardType, autoCapitalize, secureTextEntry, rightElement,
}: {
  icon: keyof typeof Feather.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  colors: Colors;
  accent: string;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "sentences" | "words";
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[
      styles.inputGroup,
      { backgroundColor: colors.card, borderColor: focused ? accent : colors.border },
    ]}>
      <Feather name={icon} size={16} color={focused ? accent : colors.mutedForeground} />
      <TextInput
        style={[styles.input, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "words"}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightElement}
    </View>
  );
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [track, setTrack] = useState("frontend");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    consumePendingRef().then((ref) => {
      if (ref) setReferralCode(ref);
    }).catch(() => {});
  }, []);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const accent = role === "tutor" ? "#6366F1" : colors.primary;

  const handleSelectRole = (r: Role) => {
    setRole(r);
    setTimeout(() => setStep(2), 120);
  };

  const handleRegister = async () => {
    if (!role) return;
    if (!email || !password || !username || !displayName) {
      showToast({ type: "warning", title: "Missing fields", message: "Please fill in all required fields" });
      return;
    }
    if (password.length < 8) {
      showToast({ type: "warning", title: "Weak password", message: "Password must be at least 8 characters" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            displayName,
            track,
            school: school.trim() || undefined,
            referralCode: referralCode.trim().toUpperCase() || undefined,
            isTutor: role === "tutor",
          },
        },
      });

      if (error) {
        showToast({ type: "error", title: "Registration failed", message: error.message });
        return;
      }

      // The trigger on Supabase should create the profile, but we add a fallback
      // and map the snake_case fields to camelCase.
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user?.id)
        .single();

      if (profileError && data.user) {
        // Try manual creation if trigger failed/is missing
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            email: data.user.email,
            username,
            display_name: displayName,
            track,
            school: school.trim() || undefined,
            referral_code: referralCode.trim().toUpperCase() || undefined,
          })
          .select()
          .single();

        if (!createError) {
          profile = newProfile;
          profileError = null;
        }
      }

      if (profileError || !profile) {
        showToast({ type: "error", title: "Profile error", message: "Account created, but profile could not be loaded." });
        return;
      }

      const userProfile: UserProfile = {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        track: profile.track,
        school: profile.school,
        referralCode: profile.referral_code,
        level: profile.purchased_level ?? 1,
        xpBalance: profile.xp_balance ?? 0,
        fundsBalance: profile.funds_balance ?? 0,
        tutorVerified: profile.tutor_verified ?? 0,
        createdAt: profile.created_at,
      };

      await login(data.session?.access_token || "", userProfile);

      const pending = await consumePendingRedirect();

      if (role === "tutor") {
        showToast({ type: "success", title: "Welcome, Tutor!", message: "Your Tutor Studio is ready." });
        router.replace("/(tabs)/studio" as never);
      } else if (pending?.type === "bootcamp") {
        showToast({ type: "success", title: "Welcome to Zero Club!", message: "Opening your bootcamp…" });
        router.replace("/(tabs)/bootcamps" as never);
      } else if (pending?.type === "post") {
        showToast({ type: "success", title: "Welcome to Zero Club!", message: "Opening the post…" });
        router.replace({ pathname: "/post/[id]", params: { id: pending.id } } as never);
      } else {
        showToast({ type: "success", title: "Welcome to Zero Club!", message: "Your builder journey starts now." });
        router.replace("/(tabs)" as never);
      }
    } catch (err) {
      console.error(err);
      showToast({ type: "error", title: "Network error", message: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // STEP 1 — Role picker
  if (step === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPadding + 32, paddingBottom: bottomPadding + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Back to login */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Image source={LOGO} style={styles.logo} />
            <Text style={[styles.appName, { color: colors.foreground }]}>Join Zero Club</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              First, tell us — who are you?
            </Text>
          </View>

          <View style={styles.roleCardsContainer}>
            {ROLE_DATA.map((r) => (
              <TouchableOpacity
                key={r.key}
                onPress={() => handleSelectRole(r.key)}
                style={[styles.bigRoleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.85}
              >
                <View style={[styles.bigRoleIconWrap, { backgroundColor: r.accent + "20" }]}>
                  <Feather name={r.icon} size={28} color={r.accent} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.bigRoleTop}>
                    <Text style={[styles.bigRoleLabel, { color: colors.foreground }]}>{r.label}</Text>
                    <View style={[styles.bigRoleTaglineBadge, { backgroundColor: r.accent + "20" }]}>
                      <Text style={[styles.bigRoleTaglineText, { color: r.accent }]}>{r.tagline}</Text>
                    </View>
                  </View>
                  <Text style={[styles.bigRoleDesc, { color: colors.mutedForeground }]}>{r.description}</Text>
                  <View style={styles.perkList}>
                    {r.perks.map((p) => (
                      <View key={p} style={styles.perkRow}>
                        <Feather name="check-circle" size={12} color={r.accent} />
                        <Text style={[styles.perkText, { color: colors.mutedForeground }]}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.bigRoleArrow, { backgroundColor: r.accent + "20" }]}>
                  <Feather name="arrow-right" size={16} color={r.accent} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Already a member?</Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>{" "}Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // STEP 2 — Details form
  const selectedRole = ROLE_DATA.find((r) => r.key === role)!;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 20, paddingBottom: bottomPadding + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back to role select */}
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        {/* Role badge header */}
        <View style={[styles.roleBanner, { backgroundColor: accent + "15", borderColor: accent + "40" }]}>
          <View style={[styles.roleBannerIcon, { backgroundColor: accent + "25" }]}>
            <Feather name={selectedRole.icon} size={18} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleBannerLabel, { color: accent }]}>
              Signing up as {selectedRole.label}
            </Text>
            <Text style={[styles.roleBannerSub, { color: colors.mutedForeground }]}>
              {selectedRole.tagline}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7}>
            <Text style={[styles.changeRole, { color: accent }]}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <InputField
            icon="user" placeholder="Display name" value={displayName}
            onChangeText={setDisplayName} colors={colors} accent={accent}
          />
          <InputField
            icon="at-sign" placeholder="Username" value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ""))}
            colors={colors} accent={accent} autoCapitalize="none"
          />
          <InputField
            icon="mail" placeholder="Email" value={email}
            onChangeText={setEmail} colors={colors} accent={accent}
            keyboardType="email-address" autoCapitalize="none"
          />
          {role === "student" && (
            <InputField
              icon="map-pin" placeholder="School name (e.g. Kings College Lagos)"
              value={school} onChangeText={setSchool} colors={colors} accent={accent}
            />
          )}
          <InputField
            icon="gift" placeholder="Referral code (optional)" value={referralCode}
            onChangeText={(t) => setReferralCode(t.toUpperCase())}
            colors={colors} accent={accent} autoCapitalize="none"
          />

          {/* Password */}
          <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Track */}
          <View style={{ gap: 8 }}>
            <Text style={[styles.trackLabel, { color: colors.mutedForeground }]}>
              {role === "tutor" ? "Your Teaching Track" : "Your Learning Track"}
            </Text>
            <View style={styles.trackGrid}>
              {TRACKS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTrack(t.key)}
                  style={[
                    styles.trackOption,
                    {
                      backgroundColor: track === t.key ? accent : colors.card,
                      borderColor: track === t.key ? accent : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.trackText, { color: track === t.key ? "#fff" : colors.mutedForeground }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: loading ? colors.muted : accent }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading
                ? "Creating account…"
                : role === "tutor"
                ? "Join as Tutor"
                : "Join the Club"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>Already a member?</Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={[styles.switchLink, { color: accent }]}>{" "}Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 22 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  logoRow: { alignItems: "center", gap: 8 },
  logo: { width: 60, height: 60, borderRadius: 16 },
  appName: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 14, textAlign: "center" },

  // Step 1 role cards
  roleCardsContainer: { gap: 12 },
  bigRoleCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    borderRadius: 20, borderWidth: 1.5, padding: 18,
  },
  bigRoleIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  bigRoleTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  bigRoleLabel: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  bigRoleTaglineBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  bigRoleTaglineText: { fontSize: 10, fontWeight: "700" },
  bigRoleDesc: { fontSize: 12, lineHeight: 18 },
  perkList: { gap: 4, marginTop: 4 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  perkText: { fontSize: 12 },
  bigRoleArrow: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", alignSelf: "center" },

  // Step 2 form
  roleBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  roleBannerIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  roleBannerLabel: { fontSize: 14, fontWeight: "700" },
  roleBannerSub: { fontSize: 11, marginTop: 1 },
  changeRole: { fontSize: 12, fontWeight: "700" },
  form: { gap: 10 },
  inputGroup: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  trackLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  trackGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  trackOption: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  trackText: { fontSize: 12, fontWeight: "600" },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  switchText: { fontSize: 14 },
  switchLink: { fontSize: 14, fontWeight: "700" },
});
