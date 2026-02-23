import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

/* 🔹 COMPONENTS (you already built these) */
import PayoutHistoryList from "@/components/seller-hub/payouts/PayoutHistoryList"
import PayoutSummaryCard from "@/components/seller-hub/payouts/PayoutStatsCard"

/* ---------------- TYPES ---------------- */

type Wallet = {
  id: string
  user_id: string | null
  available_balance_cents: number
  pending_balance_cents: number
  lifetime_earnings_cents: number
  currency: string
}

type Payout = {
  id: string
  user_id: string
  wallet_id: string
  amount_cents: number
  fee_cents: number
  net_cents: number
  method: string
  status: string
  created_at: string
}

/* ---------------- SCREEN ---------------- */

export default function PayoutHistoryScreen() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadFinancialData()
    }
  }, [userId])

  const loadFinancialData = async () => {
    try {
      setLoading(true)

      /* 🔹 1. GET WALLET (SOURCE OF TRUTH FOR EARNINGS) */
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single()

      // PGRST116 = no rows (brand new seller, no wallet yet)
      if (walletError && walletError.code !== "PGRST116") {
        throw walletError
      }

      if (walletData) {
        setWallet(walletData)
      }

      /* 🔹 2. GET PAYOUT HISTORY (WITHDRAWALS) */
      const { data: payoutsData, error: payoutsError } = await supabase
        .from("payouts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (payoutsError) throw payoutsError

      setPayouts(payoutsData || [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load payout history.",
        context: "payout-history-load",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- DERIVED METRICS (MVP SIMPLE + ACCURATE) ---------------- */

  // From wallets table (confirmed schema)
  const lifetimeEarnings = wallet?.lifetime_earnings_cents ?? 0

  // Only count ACTUAL completed withdrawals
  // (pending should NOT count as withdrawn)
  const totalWithdrawn = useMemo(() => {
    return payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.net_cents ?? 0), 0)
  }, [payouts])

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Payout History" backRoute="/seller-hub" />
        <ActivityIndicator style={{ marginTop: 80 }} />
      </View>
    )
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* 🔥 GLOBAL HEADER (MELO CONSISTENCY) */}
      <AppHeader title="Payout History" backRoute="/seller-hub" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 💰 FINANCIAL SUMMARY (HISTORY ONLY — NOT WALLET PAGE) */}
        <PayoutSummaryCard
          lifetimeEarningsCents={lifetimeEarnings}
          totalWithdrawnCents={totalWithdrawn}
        />

        {/* 📜 PAYOUT HISTORY LIST */}
        <PayoutHistoryList payouts={payouts} />

        {/* 📌 EMPTY STATE (POLISHED UX) */}
        {payouts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Payouts Yet</Text>
            <Text style={styles.emptyText}>
              Once you withdraw funds from your wallet, your payout history will
              appear here for tracking and record purposes.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF", // Melo soft background
  },
  scrollContent: {
    paddingBottom: 120,
  },
  emptyState: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2EFE8",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 18,
  },
})