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

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bootcamps">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Bootcamps</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Post</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <Icon sf={{ default: "wallet.pass", selected: "wallet.pass.fill" }} />
        <Label>Wallet</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const TAB_ITEMS: {
  name: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  sfSymbol?: string;
}[] = [
  { name: "index", label: "Feed", icon: "home", sfSymbol: "house" },
  { name: "bootcamps", label: "Learn", icon: "book", sfSymbol: "book" },
  { name: "create", label: "Post", icon: "plus" },
  { name: "chat", label: "Chat", icon: "message-circle", sfSymbol: "message" },
  { name: "wallet", label: "Wallet", icon: "credit-card", sfSymbol: "creditcard" },
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
          const tab = TAB_ITEMS[index];
          if (!tab) return null;
          const isFocused = state.index === index;
          const isCreate = tab.name === "create";

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

          if (isCreate) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.85}
                style={styles.tabItem}
              >
                <View
                  style={[
                    styles.createBtn,
                    { backgroundColor: isFocused ? colors.primary : colors.muted },
                  ]}
                >
                  <Feather
                    name="plus"
                    size={19}
                    color={isFocused ? "#fff" : colors.mutedForeground}
                  />
                </View>
              </TouchableOpacity>
            );
          }

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

function ClassicTabLayout() {
  return (
    <Tabs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props: any) => <FloatingTabBar state={props.state} navigation={props.navigation} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#0D0D0D" } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bootcamps" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="wallet" />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    paddingHorizontal: 6,
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
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
  },
  activeLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  inactiveItem: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
