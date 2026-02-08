import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import * as Linking from "expo-linking"
import { useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
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
  stripe_onboarding_complete: boolean
}

/* ---------------- SCREEN ---------------- */

export default function SellerWalletScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  /* ---------------- LOAD DATA ---------------- */

  const loadData = async () => {
    setLoading(true)

    const [
      { data: walletData },
      { data: profileData },
    ] = await Promise.all([
      supabase
        .from("wallets")
        .select(
          "id, available_balance_cents, pending_balance_cents, lifetime_earnings_cents, currency"
        )
        .eq("user_id", session!.user.id)
        .single(),

      supabase
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("id", session!.user.id)
        .single(),
    ])

    setWallet(walletData ?? null)
    setProfile(profileData ?? null)
    setLoading(false)
  }

  /* ✅ KEY FIX: REFRESH ON SCREEN FOCUS */
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        loadData()
      }
    }, [session?.user?.id])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [])

  if (loading || !wallet) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  const available = wallet.available_balance_cents / 100
  const pending = wallet.pending_balance_cents / 100
  const lifetime = wallet.lifetime_earnings_cents / 100

  const hasStripe = !!profile?.stripe_account_id

  /* ---------------- STRIPE ONBOARDING ---------------- */

  const handlePayoutSetup = async () => {
    try {
      const { data } = await supabase.functions.invoke(
        "create-connect-account-link",
        {
          body: {
            email: session?.user?.email,
            stripe_account_id: profile?.stripe_account_id,
          },
        }
      )

      const onboardingUrl = data?.url ?? data?.data?.url
      const stripeAccountId =
        data?.stripe_account_id ?? data?.data?.stripe_account_id

      if (!onboardingUrl) {
        Alert.alert("Error", "Failed to open Stripe onboarding")
        return
      }

      if (!profile?.stripe_account_id && stripeAccountId) {
        await supabase
          .from("profiles")
          .update({ stripe_account_id: stripeAccountId })
          .eq("id", session!.user.id)
      }

      await Linking.openURL(onboardingUrl)
    } catch {
      Alert.alert("Error", "Unexpected error opening Stripe onboarding")
    }
  }

  /* ---------------- WITHDRAW (ROUTING ONLY) ---------------- */

  const handleWithdraw = () => {
    if (available <= 0) return
    router.push("/seller-hub/wallet/withdrawal")
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.lifetimeBlock}>
          <Text style={styles.cardLabel}>Lifetime Earnings</Text>
          <Text style={styles.primaryValue}>
            ${lifetime.toFixed(2)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Withdrawable Balance</Text>
          <Text style={styles.balance}>${available.toFixed(2)}</Text>

          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              available <= 0 && { opacity: 0.4 },
            ]}
            disabled={available <= 0}
            onPress={handleWithdraw}
          >
            <Text style={styles.withdrawText}>Withdraw Funds</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pending Escrow</Text>
          <Text style={styles.pending}>${pending.toFixed(2)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Payout Method</Text>

          <TouchableOpacity
            style={styles.payoutBtn}
            onPress={handlePayoutSetup}
          >
            <Text style={styles.payoutText}>
              {hasStripe ? "Edit payout method" : "Set up payout method"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#0F1E17" },
  content: { padding: 16, gap: 16 },

  lifetimeBlock: {
    alignItems: "center",
    marginBottom: 8,
  },

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },

  cardLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B8F7D",
    marginBottom: 6,
  },

  primaryValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F1E17",
  },

  balance: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 12,
  },

  pending: { fontSize: 26, fontWeight: "900", color: "#B8860B" },

  withdrawBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 14,
    borderRadius: 14,
  },

  withdrawText: { textAlign: "center", fontWeight: "900", color: "#fff" },

  payoutBtn: {
    marginTop: 8,
    backgroundColor: "#E8F5EE",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F7A63",
  },

  payoutText: { textAlign: "center", fontWeight: "900", color: "#1F7A63" },
})
