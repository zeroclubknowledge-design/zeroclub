import "../global.css";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { DialogProvider } from "@/context/DialogContext";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { registerForPushNotifications } from "@/services/notifications";

const ZERO_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0D0D0D",
    card: "#1A1A1A",
    text: "#FFFFFF",
    border: "#2A2A2A",
    primary: "#D4387C",
    notification: "#D4387C",
  },
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const domain = process.env["EXPO_PUBLIC_DOMAIN"];
if (domain) {
  setBaseUrl(`https://${domain}`);
}

let _splashComplete = false;

export function markSplashComplete() {
  _splashComplete = true;
}

function NotificationRegistrar() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function register() {
      try {
        const pushToken = await registerForPushNotifications();
        if (cancelled || !pushToken) return;
        const baseUrl = process.env["EXPO_PUBLIC_DOMAIN"]
          ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`
          : "";
        await fetch(`${baseUrl}/api/profiles/me/push-token`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pushToken }),
        });
      } catch {
        // Non-critical
      }
    }

    void register();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    const isSplash = pathname === "/splash";
    const isAuthScreen = pathname === "/login" || pathname === "/register" || isSplash || pathname.startsWith("/share/");

    if (!token && !isAuthScreen) {
      if (!_splashComplete) {
        router.replace("/splash");
      } else {
        router.replace("/login");
      }
    } else if (token && isAuthScreen) {
      router.replace("/(tabs)" as never);
    }
  }, [token, isLoading, pathname, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <NotificationRegistrar />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0D0D0D" } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="register" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="channel/[id]" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="bootcamp/[id]" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="settings" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="referral" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="club-levels" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="comments/[postId]" options={{ headerShown: false, animation: "slide_from_bottom", presentation: "modal" }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="bootcamp-hub/[id]" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="share/bootcamp/[id]" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="share/post/[id]" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="zero-proof" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="tutor/create" options={{ headerShown: false, animation: "slide_from_bottom" }} />
        <Stack.Screen name="tutor/[id]" options={{ headerShown: false, animation: "none" }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={ZERO_THEME}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
                <KeyboardProvider>
                  <ToastProvider>
                    <DialogProvider>
                      <RootLayoutNav />
                    </DialogProvider>
                  </ToastProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
