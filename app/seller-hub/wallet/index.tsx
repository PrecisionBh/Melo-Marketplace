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

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
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
  const [redirecting, setRedirecting] = useState(false) // ✅ ADDED ONLY

  /* ---------------- LOAD DATA ---------------- */

  const loadData = async () => {
    try {
      if (!session?.user?.id) {
        setWallet(null)
        setProfile(null)
        return
      }

      setLoading(true)

      const [
        { data: walletData, error: walletError },
        { data: profileData, error: profileError },
      ] = await Promise.all([
        supabase
          .from("wallets")
          .select(
            "id, available_balance_cents, pending_balance_cents, lifetime_earnings_cents, currency"
          )
          .eq("user_id", session.user.id)
          .single(),

        supabase
          .from("profiles")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("id", session.user.id)
          .single(),
      ])

      if (walletError) throw walletError
      if (profileError) throw profileError

      setWallet(walletData ?? null)
      setProfile(profileData ?? null)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load wallet data.",
      })
      setWallet(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
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
    try {
      setRefreshing(true)
      await loadData()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to refresh wallet.",
      })
    } finally {
      setRefreshing(false)
    }
  }, [session?.user?.id])

  if (loading || !wallet) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  const available = (wallet.available_balance_cents ?? 0) / 100
  const pending = (wallet.pending_balance_cents ?? 0) / 100
  const lifetime = (wallet.lifetime_earnings_cents ?? 0) / 100

  const hasStripe = !!profile?.stripe_account_id

  /* ---------------- STRIPE ONBOARDING ---------------- */

  const handlePayoutSetup = async () => {
    try {
      setRedirecting(true) // ✅ ADDED ONLY (show loading message)

      const { data, error } = await supabase.functions.invoke(
        "create-connect-account-link",
        {
          body: {
  user_id: session?.user?.id,
  email: session?.user?.email,
},
        }
      )

      if (error) throw error

      const onboardingUrl = data?.url ?? data?.data?.url
      const stripeAccountId =
        data?.stripe_account_id ?? data?.data?.stripe_account_id

      if (!onboardingUrl) {
        setRedirecting(false) // ✅ ADDED ONLY
        Alert.alert("Error", "Failed to open Stripe onboarding")
        return
      }

      if (!profile?.stripe_account_id && stripeAccountId && session?.user?.id) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ stripe_account_id: stripeAccountId })
          .eq("id", session.user.id)

        if (updateError) throw updateError
      }

      await Linking.openURL(onboardingUrl)
    } catch (err) {
      setRedirecting(false) // ✅ ADDED ONLY
      handleAppError(err, {
        fallbackMessage: "Unexpected error opening Stripe onboarding.",
      })
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
      <AppHeader
        title="Wallet"
        backLabel="Seller Hub"
        backRoute="/seller-hub"
      />

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

      {/* ✅ ADDED ONLY: Loading overlay when redirecting to Stripe */}
      {redirecting && (
        <View style={styles.redirectOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.redirectText}>
            Redirecting to Stripe for payout setup...
          </Text>
        </View>
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

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

  /* ✅ ADDED ONLY */
  redirectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 30, 23, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  /* ✅ ADDED ONLY */
  redirectText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
})
