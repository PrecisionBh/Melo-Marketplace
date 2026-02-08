import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Wallet = {
  available_balance_cents: number
}

/* ---------------- CONSTANTS ---------------- */

const INSTANT_FEE_RATE = 0.03
const INSTANT_FEE_MIN = 0.75
const INSTANT_FEE_CAP = 25.0

/* ---------------- SCREEN ---------------- */

export default function WithdrawalScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [rawAmount, setRawAmount] = useState("")
  const [payoutType, setPayoutType] = useState<"instant" | "standard">(
    "instant"
  )
  const [withdrawing, setWithdrawing] = useState(false)

  /* ---------------- LOAD WALLET ---------------- */

  const loadWallet = async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("available_balance_cents")
      .eq("user_id", session!.user.id)
      .single()

    if (error) {
      Alert.alert("Error", "Failed to load wallet")
      router.back()
      return
    }

    setWallet(data)
  }

  useEffect(() => {
    if (session?.user?.id) loadWallet()
  }, [session?.user?.id])

  if (!wallet) return null

  /* ---------------- AMOUNT ---------------- */

  const available = wallet.available_balance_cents / 100
  const numericAmount =
    Number(rawAmount.replace(/[^0-9]/g, "")) / 100

  const formattedAmount = `$${numericAmount.toFixed(2)}`
  const isValidAmount =
    numericAmount > 0 && numericAmount <= available

  /* ---------------- FEES (DISPLAY ONLY) ---------------- */

  const instantFee =
    payoutType === "instant"
      ? Math.min(
          Math.max(numericAmount * INSTANT_FEE_RATE, INSTANT_FEE_MIN),
          INSTANT_FEE_CAP
        )
      : 0

  const netDeposit = numericAmount - instantFee

  /* ---------------- SUBMIT ---------------- */

  const handleWithdraw = async () => {
    if (!isValidAmount || withdrawing) return

    setWithdrawing(true)

    const amount_cents = Math.round(numericAmount * 100)

    const { error } = await supabase.functions.invoke(
      "execute-withdrawal",
      {
        body: {
          user_id: session!.user.id,
          amount_cents,
          payout_type: payoutType,
        },
      }
    )

    setWithdrawing(false)

    if (error) {
      Alert.alert(
        "Withdrawal failed",
        error.message || "Something went wrong"
      )
      return
    }

    Alert.alert(
      "Success",
      payoutType === "instant"
        ? "Your instant payout is processing."
        : "Your payout will arrive in 3–5 business days."
    )

    await loadWallet()
    router.back()
  }

  /* ---------------- UI ---------------- */

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#EAF4EF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* AVAILABLE */}
        <View style={styles.balanceBlock}>
          <Text style={styles.cardLabel}>Available balance</Text>
          <Text style={styles.primaryValue}>
            ${available.toFixed(2)}
          </Text>
        </View>

        {/* AMOUNT */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Withdrawal amount</Text>
          <TextInput
            value={formattedAmount}
            onChangeText={setRawAmount}
            keyboardType="numeric"
            style={styles.amountInput}
          />
        </View>

        {/* RECEIPT */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Receipt</Text>

          <View style={styles.row}>
            <Text>Withdrawal amount</Text>
            <Text>${numericAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.row}>
            <Text>Melo processing fee</Text>
            <Text>
              {instantFee > 0
                ? `-$${instantFee.toFixed(2)}`
                : "$0.00"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.bold}>Estimated deposit</Text>
            <Text style={styles.bold}>
              ${netDeposit.toFixed(2)}
            </Text>
          </View>

          {payoutType === "instant" && (
            <Text style={styles.helperText}>
              Instant deposits arrive in minutes. Fee capped at $25.
            </Text>
          )}
        </View>

        {/* PAYOUT TYPE */}
        <View style={styles.payoutRow}>
          <TouchableOpacity
            style={[
              styles.payoutOption,
              payoutType === "instant"
                ? styles.payoutActive
                : styles.payoutInactive,
            ]}
            onPress={() => setPayoutType("instant")}
          >
            <Text
              style={[
                styles.payoutTitle,
                payoutType !== "instant" && styles.mutedText,
              ]}
            >
              Instant
            </Text>
            <Text
              style={[
                styles.payoutSub,
                payoutType !== "instant" && styles.mutedText,
              ]}
            >
              Paid in minutes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.payoutOption,
              payoutType === "standard"
                ? styles.payoutActive
                : styles.payoutInactive,
            ]}
            onPress={() => setPayoutType("standard")}
          >
            <Text
              style={[
                styles.payoutTitle,
                payoutType !== "standard" && styles.mutedText,
              ]}
            >
              Standard
            </Text>
            <Text
              style={[
                styles.payoutSub,
                payoutType !== "standard" && styles.mutedText,
              ]}
            >
              3–5 days · Free
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isValidAmount || withdrawing) && { opacity: 0.4 },
          ]}
          disabled={!isValidAmount || withdrawing}
          onPress={handleWithdraw}
        >
          <Text style={styles.submitText}>
            {withdrawing ? "Processing…" : "Withdraw funds"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  header: {
    height: 85,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    backgroundColor: "#7FAF9B",
  },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#0F1E17" },

  content: { padding: 16, gap: 16 },

  balanceBlock: { alignItems: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },

  cardLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B8F7D",
    marginBottom: 6,
  },

  primaryValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F1E17",
  },

  amountInput: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F1E17",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 10,
  },

  bold: { fontWeight: "900" },

  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B8F7D",
  },

  payoutRow: {
    flexDirection: "row",
    gap: 12,
  },

  payoutOption: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },

  payoutActive: {
    backgroundColor: "#CFE7DD",
    borderColor: "#1F7A63",
  },

  payoutInactive: {
    backgroundColor: "#F1F1F1",
    borderColor: "#D0D0D0",
  },

  payoutTitle: {
    fontWeight: "900",
    color: "#0F1E17",
  },

  payoutSub: {
    fontSize: 12,
    marginTop: 2,
    color: "#6B8F7D",
  },

  mutedText: {
    color: "#9AA5A0",
  },

  submitBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },

  submitText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
    fontSize: 16,
  },
})
