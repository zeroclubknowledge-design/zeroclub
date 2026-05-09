import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { router, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const LOGO = require("../assets/images/icon.png");

const NAV_ITEMS: {
  route: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  iconActive: keyof typeof Feather.glyphMap;
  tutorOnly?: boolean;
}[] = [
  { route: "/(tabs)/", label: "Feed", icon: "home", iconActive: "home" },
  { route: "/(tabs)/bootcamps", label: "Learn", icon: "book-open", iconActive: "book-open" },
  { route: "/(tabs)/create", label: "New Post", icon: "plus-circle", iconActive: "plus-circle" },
  { route: "/(tabs)/chat", label: "Chat", icon: "message-circle", iconActive: "message-circle" },
  { route: "/(tabs)/wallet", label: "Wallet", icon: "credit-card", iconActive: "credit-card" },
  { route: "/(tabs)/studio", label: "Studio", icon: "tv", iconActive: "tv", tutorOnly: true },
];

const SECONDARY_ITEMS: {
  route: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { route: "/profile", label: "Profile", icon: "user" },
  { route: "/notifications", label: "Notifications", icon: "bell" },
  { route: "/settings", label: "Settings", icon: "settings" },
];

function getTabRoute(pathname: string): string {
  if (pathname === "/" || pathname === "/index") return "/(tabs)/";
  if (pathname.startsWith("/(tabs)/")) return pathname;
  return pathname;
}

export function DesktopSidebar() {
  const colors = useColors();
  const { user } = useAuth();
  const pathname = usePathname();
  const { isWide } = useBreakpoint();

  const isActive = (route: string) => {
    if (route === "/(tabs)/") return pathname === "/" || pathname === "/(tabs)/index" || pathname === "/(tabs)";
    return pathname.startsWith(route.replace("/(tabs)", ""));
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.background, borderRightColor: colors.border, width: isWide ? 240 : 200 }]}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <Image source={LOGO} style={styles.logo} />
        <Text style={[styles.logoText, { color: colors.foreground }]}>Zero Club</Text>
      </View>

      {/* Main nav */}
      <View style={styles.navSection}>
        {/* Testing phase: show all nav items including Studio */}
        {NAV_ITEMS.map((item) => {
          if (item.tutorOnly && user?.tutorVerified !== 1) return null;
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem,
                active && { backgroundColor: colors.primary + "18" },
              ]}
              onPress={() => router.push(item.route as never)}
              activeOpacity={0.8}
            >
              {item.route === "/(tabs)/create" ? (
                <View style={[styles.createIcon, { backgroundColor: active ? colors.primary : colors.muted }]}>
                  <Feather name="plus" size={16} color={active ? "#fff" : colors.mutedForeground} />
                </View>
              ) : (
                <Feather
                  name={item.icon}
                  size={18}
                  color={active ? colors.primary : colors.mutedForeground}
                />
              )}
              <Text
                style={[
                  styles.navLabel,
                  { color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? "700" : "500" },
                ]}
              >
                {item.label}
              </Text>
              {active && <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Secondary nav */}
      <View style={styles.navSection}>
        {SECONDARY_ITEMS.map((item) => {
          const active = pathname.startsWith(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.navItem, active && { backgroundColor: colors.primary + "18" }]}
              onPress={() => router.push(item.route as never)}
              activeOpacity={0.8}
            >
              <Feather
                name={item.icon}
                size={18}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? "700" : "500" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* User card at bottom */}
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/profile")}
        activeOpacity={0.85}
      >
        <View style={[styles.userAvatar, { backgroundColor: colors.primary + "30" }]}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.userAvatarImg} />
          ) : (
            <Text style={[styles.userAvatarText, { color: colors.primary }]}>
              {(user?.displayName ?? "U").slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {user?.displayName ?? "Builder"}
          </Text>
          <Text style={[styles.userHandle, { color: colors.mutedForeground }]} numberOfLines={1}>
            @{user?.username ?? "zero"}
          </Text>
        </View>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: "100%",
    borderRightWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 4,
    flexShrink: 0,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  logo: { width: 32, height: 32, borderRadius: 9 },
  logoText: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  navSection: { gap: 2 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    position: "relative",
  },
  navLabel: { fontSize: 14 },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  createIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, marginVertical: 8, marginHorizontal: 8 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  userAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  userAvatarText: { fontSize: 15, fontWeight: "700" },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: "700" },
  userHandle: { fontSize: 11, marginTop: 1 },
});
