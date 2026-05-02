import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface PaymentModalProps {
  visible: boolean;
  bootcampTitle: string;
  priceCents: number;
  onClose: () => void;
  onSuccess: (paymentRef: string) => void;
}

function formatPrice(priceCents: number): string {
  return `₦${(priceCents / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function formatCardNumber(val: string): string {
  return val
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export function PaymentModal({ visible, bootcampTitle, priceCents, onClose, onSuccess }: PaymentModalProps) {
  const colors = useColors();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    nameOnCard.trim().length > 2 &&
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3;

  const handlePay = async () => {
    setError(null);
    setLoading(true);
    try {
      // Simulate a brief processing delay for UX
      await new Promise((r) => setTimeout(r, 1200));
      // In production: call /api/payments/bootcamp/:id/initiate → get Stripe clientSecret → confirm
      // For now: generate a simulated payment ref
      const simulatedRef = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      onSuccess(simulatedRef);
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setNameOnCard("");
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={[styles.handle, { backgroundColor: colors.muted }]} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Price Summary */}
            <View style={[styles.priceBanner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
              <View>
                <Text style={[styles.priceBannerTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {bootcampTitle}
                </Text>
                <Text style={[styles.priceBannerSub, { color: colors.mutedForeground }]}>
                  One-time payment • Lifetime access
                </Text>
              </View>
              <Text style={[styles.priceAmount, { color: colors.primary }]}>
                {formatPrice(priceCents)}
              </Text>
            </View>

            {/* Card Form */}
            <View style={styles.form}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>NAME ON CARD</Text>
              <TextInput
                style={inputStyle}
                value={nameOnCard}
                onChangeText={setNameOnCard}
                placeholder="Full name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />

              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>CARD NUMBER</Text>
              <TextInput
                style={inputStyle}
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={19}
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>EXPIRY</Text>
                  <TextInput
                    style={inputStyle}
                    value={expiry}
                    onChangeText={(t) => setExpiry(formatExpiry(t))}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>CVV</Text>
                  <TextInput
                    style={inputStyle}
                    value={cvv}
                    onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              </View>

              {error && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.payBtn,
                  { backgroundColor: isValid ? colors.primary : colors.muted },
                ]}
                onPress={handlePay}
                disabled={!isValid || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="lock" size={15} color="#fff" />
                    <Text style={styles.payBtnText}>Pay {formatPrice(priceCents)}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secureRow}>
                <Feather name="shield" size={12} color={colors.mutedForeground} />
                <Text style={[styles.secureText, { color: colors.mutedForeground }]}>
                  Secured with 256-bit encryption
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 10,
    padding: 4,
  },
  priceBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  priceBannerSub: {
    fontSize: 12,
    marginTop: 3,
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: "800",
  },
  form: {
    paddingHorizontal: 16,
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  payBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    flexDirection: "row",
    gap: 8,
  },
  payBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 12,
  },
  secureText: {
    fontSize: 12,
  },
});
