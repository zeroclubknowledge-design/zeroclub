import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Animated,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";

export interface DialogButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface DialogOptions {
  title: string;
  message?: string;
  buttons?: DialogButton[];
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextValue>({ showDialog: () => {} });

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<DialogOptions | null>(null);
  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const showDialog = useCallback((options: DialogOptions) => {
    setOpts(options);
    setVisible(true);
    scale.setValue(0.88);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 130,
        friction: 11,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = useCallback(
    (btn?: DialogButton) => {
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0.9,  duration: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,    duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setVisible(false);
        btn?.onPress?.();
      });
    },
    [],
  );

  const buttons = opts?.buttons ?? [{ text: "OK", style: "default" as const }];
  const isColumn = buttons.length > 2;

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          const cancel = buttons.find((b) => b.style === "cancel");
          dismiss(cancel);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            const cancel = buttons.find((b) => b.style === "cancel");
            dismiss(cancel);
          }}
        >
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.card,
                  { opacity, transform: [{ scale }] },
                ]}
              >
                {/* Title */}
                <Text style={styles.title}>{opts?.title}</Text>

                {/* Message */}
                {opts?.message ? (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 180 }}
                    contentContainerStyle={{ paddingBottom: 2 }}
                  >
                    <Text style={styles.message}>{opts.message}</Text>
                  </ScrollView>
                ) : null}

                {/* Divider */}
                <View style={styles.divider} />

                {/* Buttons */}
                <View style={[styles.btnRow, isColumn && styles.btnCol]}>
                  {buttons.map((btn, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.btn,
                        !isColumn && { flex: 1 },
                        btn.style === "cancel"      && styles.btnCancel,
                        btn.style === "destructive" && styles.btnDestructive,
                        (!btn.style || btn.style === "default") && styles.btnDefault,
                      ]}
                      onPress={() => dismiss(btn)}
                      activeOpacity={0.72}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          btn.style === "cancel"      && styles.btnTextCancel,
                          btn.style === "destructive" && styles.btnTextDestructive,
                          (!btn.style || btn.style === "default") && styles.btnTextDefault,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#181818",
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 18,
    width: "100%",
    maxWidth: 390,
    gap: 14,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 22,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  message: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#2c2c2c",
    marginHorizontal: -22,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnCol: {
    flexDirection: "column",
    gap: 8,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDefault: {
    backgroundColor: "#D4387C",
  },
  btnCancel: {
    backgroundColor: "#282828",
  },
  btnDestructive: {
    backgroundColor: "rgba(220,38,38,0.15)",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  btnTextDefault: {
    color: "#fff",
  },
  btnTextCancel: {
    color: "rgba(255,255,255,0.62)",
  },
  btnTextDestructive: {
    color: "#ef4444",
  },
});
