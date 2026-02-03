import { Ionicons } from "@expo/vector-icons"
import * as Linking from "expo-linking"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Wallet = {
  id: string
  available_balance_cents: number
  pending_balance_cents: number
  lifetime_earnings_cents: number
  currency: string
}

type Profile = {
  stripe_account_id: string | null
}

/* ---------------- SCREEN ---------------- */

export default function SellerWalletScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      loadData()
    }
  }, [session?.user?.id])

  const loadData = async () => {
    setLoading(true)

    const [{ data: walletData }, { data: profileData }] =
      await Promise.all([
        supabase
          .from("wallets")
          .select(
            "id, available_balance_cents, pending_balance_cents, lifetime_earnings_cents, currency"
          )
          .eq("user_id", session!.user.id)
          .single(),

        supabase
          .from("profiles")
          .select("stripe_account_id")
          .eq("id", session!.user.id)
          .single(),
      ])

    setWallet(walletData ?? null)
    setProfile(profileData ?? null)
    setLoading(false)
  }

  /* ---------------- STRIPE CONNECT ---------------- */

  const openPayoutSetup = async () => {
    if (!session?.user?.id) return

    try {
      setConnecting(true)

      const { data, error } = await supabase.functions.invoke(
        "create-connect-account-link",
        {
          body: {
            user_id: session.user.id,
          },
        }
      )

      if (error || !data?.url) {
        throw error || new Error("No onboarding URL returned")
      }

      await Linking.openURL(data.url)
    } catch (err: any) {
      alert(err?.message || "Unable to start payout setup")
    } finally {
      setConnecting(false)
    }
  }

  if (loading || !wallet) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  const available = wallet.available_balance_cents / 100
  const pending = wallet.pending_balance_cents / 100
  const lifetime = wallet.lifetime_earnings_cents / 100

  const hasStripe = !!profile?.stripe_account_id

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        {/* AVAILABLE BALANCE */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Withdrawable Balance</Text>
          <Text style={styles.balance}>${available.toFixed(2)}</Text>

          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              available <= 0 && { opacity: 0.4 },
            ]}
            disabled={available <= 0}
            onPress={() => alert("Withdraw flow next")}
          >
            <Text style={styles.withdrawText}>Withdraw Funds</Text>
          </TouchableOpacity>
        </View>

        {/* PENDING ESCROW */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pending Escrow</Text>
          <Text style={styles.pending}>${pending.toFixed(2)}</Text>

          <Text style={styles.helperText}>
            Funds are released after delivery is confirmed or automatically
            after the protection window.
          </Text>
        </View>

        {/* LIFETIME */}
        <View style={styles.cardSubtle}>
          <Text style={styles.subtleLabel}>Lifetime Earnings</Text>
          <Text style={styles.subtleValue}>
            ${lifetime.toFixed(2)}
          </Text>
        </View>

        {/* STRIPE CONNECT (BOTTOM) */}
        <View style={styles.payoutBox}>
          <Text style={styles.payoutTitle}>Payout Settings</Text>

          <TouchableOpacity
            style={[
              styles.payoutBtn,
              connecting && { opacity: 0.6 },
            ]}
            onPress={openPayoutSetup}
            disabled={connecting}
          >
            <Text style={styles.payoutText}>
              {hasStripe ? "Edit payout details" : "Set up payouts"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.payoutHelper}>
            Secure payouts powered by Stripe. Bank info is never stored by us.
          </Text>
        </View>
      </View>
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

  balance: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 12,
  },

  pending: {
    fontSize: 26,
    fontWeight: "900",
    color: "#B8860B",
    marginBottom: 8,
  },

  withdrawBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 14,
    borderRadius: 14,
  },

  withdrawText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
  },

  helperText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },

  cardSubtle: {
    backgroundColor: "#F4FBF8",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },

  subtleLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B8F7D",
    marginBottom: 4,
  },

  subtleValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
  },

  payoutBox: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },

  payoutTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
    color: "#0F1E17",
  },

  payoutBtn: {
    backgroundColor: "#0F1E17",
    paddingVertical: 14,
    borderRadius: 14,
  },

  payoutText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },

  payoutHelper: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B8F7D",
    textAlign: "center",
  },
})
