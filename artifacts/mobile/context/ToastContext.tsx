import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export type ToastType = "success" | "error" | "info" | "xp" | "warning";

export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const PALETTE: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "#06170e", border: "#16a34a", icon: "#22c55e" },
  error:   { bg: "#1a0707", border: "#dc2626", icon: "#ef4444" },
  info:    { bg: "#0c1624", border: "#3b82f6", icon: "#60a5fa" },
  xp:      { bg: "#180f00", border: "#d97706", icon: "#f59e0b" },
  warning: { bg: "#160b00", border: "#ea580c", icon: "#f97316" },
};

const ICONS: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error:   "x-circle",
  info:    "info",
  xp:      "zap",
  warning: "alert-triangle",
};

function SingleToast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-90)).current;

  const type     = item.type ?? "info";
  const palette  = PALETTE[type];
  const duration = item.duration ?? 3600;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 11,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -90, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDone());
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const top = Platform.OS === "web" ? 72 : insets.top + 12;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          top,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.border + "33" }]}>
        <Feather name={ICONS[type]} size={17} color={palette.icon} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.toastTitle} numberOfLines={1}>{item.title}</Text>
        {item.message ? (
          <Text style={styles.toastMsg} numberOfLines={2}>{item.message}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={14} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setQueue((prev) => [...prev.slice(-2), { ...options, id }]);
  }, []);

  const remove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {queue.map((item, idx) => (
        <Animated.View
          key={item.id}
          style={{ position: "absolute", left: 0, right: 0, top: idx * 8, zIndex: 9990 + idx }}
          pointerEvents="box-none"
        >
          <SingleToast item={item} onDone={() => remove(item.id)} />
        </Animated.View>
      ))}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: { flex: 1, gap: 2 },
  toastTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  toastMsg: { color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 16 },
});
