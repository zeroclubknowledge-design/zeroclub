import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useAuth } from "@/context/AuthContext";

function NativeTabLayout() {
  const { user, isLoading } = useAuth();
  // Strictly check for 1. Anything else (0, null, undefined) is a student.
  const isTutor = !isLoading && user && Number(user.tutorVerified) === 1;
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      {!isTutor && (
        <NativeTabs.Trigger name="bootcamps">
          <Icon sf={{ default: "book", selected: "book.fill" }} />
          <Label>Learn</Label>
        </NativeTabs.Trigger>
      )}
      {isTutor && (
        <NativeTabs.Trigger name="studio">
          <Icon sf={{ default: "tv", selected: "tv.fill" }} />
          <Label>Studio</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <Icon sf={{ default: "wallet.pass", selected: "wallet.pass.fill" }} />
        <Label>Wallet</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const BASE_TAB_ITEMS: {
  name: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  sfSymbol?: string;
  tutorOnly?: boolean;
  studentOnly?: boolean;
}[] = [
  { name: "index", label: "Feed", icon: "home", sfSymbol: "house" },
  { name: "bootcamps", label: "Learn", icon: "book", sfSymbol: "book", studentOnly: true },
  { name: "studio", label: "Studio", icon: "tv", sfSymbol: "tv", tutorOnly: true },
  { name: "chat", label: "Chat", icon: "message-circle", sfSymbol: "message" },
  { name: "wallet", label: "Wallet", icon: "credit-card", sfSymbol: "creditcard" },
  { name: "profile", label: "Profile", icon: "user", sfSymbol: "person" },
];

interface TabBarRoute {
  key: string;
  name: string;
}

interface TabBarState {
  index: number;
  routes: TabBarRoute[];
}

interface TabBarNavigation {
  emit: (opts: { type: string; target: string; canPreventDefault: boolean }) => {
    defaultPrevented: boolean;
  };
  navigate: (name: string) => void;
}

function FloatingTabBar({
  state,
  navigation,
}: {
  state: TabBarState;
  navigation: TabBarNavigation;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { isDesktop } = useBreakpoint();
  const { user, isLoading } = useAuth();
  // Strictly check for 1. Anything else (0, null, undefined) is a student.
  const isTutor = !isLoading && user && Number(user.tutorVerified) === 1;

  const TAB_ITEMS = BASE_TAB_ITEMS.filter((t) => {
    if (t.tutorOnly && !isTutor) return false;
    if (t.studentOnly && isTutor) return false;
    return true;
  });

  if (isDesktop) return null;

  return (
    <View
      style={[styles.tabBarOuter, { bottom: isWeb ? 12 : insets.bottom + 10 }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.tabBarInner,
          { backgroundColor: colors.card, borderColor: colors.border, shadowColor: "#000" },
        ]}
      >
        {state.routes.map((route: TabBarRoute, index: number) => {
          const tab = TAB_ITEMS.find((t) => t.name === route.name);
          if (!tab) return null;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}
            >
              {isFocused ? (
                <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                  {isIOS && tab.sfSymbol ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <SymbolView name={tab.sfSymbol as any} tintColor="#fff" size={14} />
                  ) : (
                    <Feather name={tab.icon} size={14} color="#fff" />
                  )}
                  <Text style={styles.activeLabel} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </View>
              ) : (
                <View style={styles.inactiveItem}>
                  {isIOS && tab.sfSymbol ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <SymbolView name={tab.sfSymbol as any} tintColor={colors.mutedForeground} size={20} />
                  ) : (
                    <Feather name={tab.icon} size={20} color={colors.mutedForeground} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DesktopTabsWrapper({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.desktopShell, { backgroundColor: colors.background }]}>
      <DesktopSidebar />
      <View style={styles.desktopContent}>{children}</View>
    </View>
  );
}

function ClassicTabLayout() {
  const { isDesktop } = useBreakpoint();
  const { user, isLoading } = useAuth();
  // Strictly check for 1. Anything else (0, null, undefined) is a student.
  const isTutor = !isLoading && user && Number(user.tutorVerified) === 1;

  const tabs = (
    <Tabs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props: any) => <FloatingTabBar state={props.state} navigation={props.navigation} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#0D0D0D" } }}
    >
      <Tabs.Screen name="index" />
      {!isTutor && <Tabs.Screen name="bootcamps" />}
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="wallet" />
      {isTutor && <Tabs.Screen name="studio" />}
      <Tabs.Screen name="profile" />
    </Tabs>
  );

  if (isDesktop) {
    return <DesktopTabsWrapper>{tabs}</DesktopTabsWrapper>;
  }

  return tabs;
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  desktopShell: {
    flex: 1,
    flexDirection: "row",
  },
  desktopContent: {
    flex: 1,
    overflow: "hidden",
  },
  tabBarOuter: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  tabBarInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: Platform.OS === "web" ? 0 : 1,
    paddingHorizontal: 4,
    paddingVertical: 6,
    width: "100%",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    overflow: "hidden",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 22,
    maxWidth: "100%",
  },
  activeLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
  inactiveItem: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  createBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
