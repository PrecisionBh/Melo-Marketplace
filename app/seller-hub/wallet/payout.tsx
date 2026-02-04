import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Wallet = {
  available_balance_cents: number
  currency: string
}

type PayoutPreview = {
  method: "ach" | "instant"
  gross_amount: number
  fee: number
  net_amount: number
  currency: string
}

/* ---------------- SCREEN ---------------- */

export default function PayoutScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [method, setMethod] = useState<"ach" | "instant" | null>(null)
  const [preview, setPreview] = useState<PayoutPreview | null>(null)

  useEffect(() => {
    if (session?.user?.id) loadWallet()
  }, [session?.user?.id])

  const loadWallet = async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("available_balance_cents, currency")
      .eq("user_id", session!.user.id)
      .single()

    if (error) {
      console.error("Wallet load failed:", error)
      setLoading(false)
      return
    }

    setWallet(data)
    setLoading(false)
  }

  /* ---------------- PREVIEW PAYOUT ---------------- */

  const previewPayout = async () => {
    if (!method || !session?.user?.id) return

    try {
      setSubmitting(true)

      const { data, error } = await supabase.functions.invoke(
        "create-payout",
        {
          body: {
            user_id: session.user.id, // ✅ OPTION A FIX
            method,                  // "ach" | "instant"
          },
        }
      )

      if (error || !data?.preview) {
        throw error || new Error("Unable to preview payout")
      }

      setPreview({
        method: data.method,
        gross_amount: data.gross_amount,
        fee: data.fee,
        net_amount: data.net_amount,
        currency: data.currency,
      })
    } catch (err: any) {
      Alert.alert(
        "Payout error",
        err?.message || "Unable to preview payout."
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- UI ---------------- */

  if (loading || !wallet) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  const available = wallet.available_balance_cents / 100

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Funds</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        {/* BALANCE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>
            ${available.toFixed(2)}
          </Text>
        </View>

        {/* ACH OPTION */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            method === "ach" && styles.optionSelected,
          ]}
          onPress={() => setMethod("ach")}
        >
          <View>
            <Text style={styles.optionTitle}>
              Standard payout (ACH)
            </Text>
            <Text style={styles.optionSub}>
              Free • 3–5 business days
            </Text>
          </View>
          {method === "ach" && (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#1F7A63"
            />
          )}
        </TouchableOpacity>

        {/* INSTANT OPTION */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            method === "instant" && styles.optionSelected,
          ]}
          onPress={() => setMethod("instant")}
        >
          <View>
            <Text style={styles.optionTitle}>
              Instant payout
            </Text>
            <Text style={styles.optionSub}>
              2% fee • Max $25
            </Text>
          </View>
          {method === "instant" && (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color="#1F7A63"
            />
          )}
        </TouchableOpacity>

        {/* CONFIRM */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!method || submitting) && { opacity: 0.5 },
          ]}
          disabled={!method || submitting}
          onPress={previewPayout}
        >
          <Text style={styles.confirmText}>
            {submitting ? "Calculating…" : "Review Withdrawal"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Payout amounts are calculated securely on the server.
        </Text>
      </View>

      {/* PREVIEW MODAL */}
      <Modal transparent visible={!!preview} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Payout</Text>

            {preview && (
              <>
                <Row label="Withdrawal amount" value={`$${preview.gross_amount.toFixed(2)}`} />
                <Row label="Fee" value={`$${preview.fee.toFixed(2)}`} />
                <Row
                  label="You’ll receive"
                  value={`$${preview.net_amount.toFixed(2)}`}
                  bold
                />
                <Row label="Method" value={preview.method.toUpperCase()} />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPreview(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { marginTop: 0 }]}
                disabled
              >
                <Text style={styles.confirmText}>
                  Confirm (Step 7)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ---------------- HELPERS ---------------- */

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: "900" }]}>
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  header: {
    height: 85,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    backgroundColor: "#7FAF9B",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  content: {
    padding: 16,
    gap: 16,
  },

  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },

  balanceLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B8F7D",
    marginBottom: 6,
  },

  balanceValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F1E17",
  },

  optionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  optionSelected: {
    borderColor: "#1F7A63",
    backgroundColor: "#F0FAF6",
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },

  optionSub: {
    fontSize: 13,
    color: "#6B8F7D",
    marginTop: 4,
  },

  confirmBtn: {
    marginTop: 10,
    backgroundColor: "#1F7A63",
    paddingVertical: 16,
    borderRadius: 16,
  },

  confirmText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
    fontSize: 15,
  },

  disclaimer: {
    fontSize: 12,
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  rowLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
  },

  rowValue: {
    fontWeight: "700",
  },

  modalActions: {
    marginTop: 16,
    gap: 10,
  },

  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EB5757",
  },

  cancelText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#EB5757",
  },
})
