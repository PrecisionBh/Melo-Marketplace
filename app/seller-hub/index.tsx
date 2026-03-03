import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"

import AppHeader from "@/components/app-header"
import UpgradeToProButton from "@/components/pro/UpgradeToProButton"
import FreeDashboardSection from "@/components/seller-hub/FreeDashboardSection"
import ProBenefitsCard from "@/components/seller-hub/ProBenefitsCard"
import ProDashboardSection from "@/components/seller-hub/ProDashboardSection"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function SellerHubScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const sellerId = session?.user?.id

  const [ordersToShipCount, setOrdersToShipCount] = useState(0)
  const [ordersInProgressCount, setOrdersInProgressCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [offersActionCount, setOffersActionCount] = useState(0)

  const [proLoading, setProLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)

  /* ---------------- LOAD COUNTS ---------------- */

useFocusEffect(
  useCallback(() => {
    const runEscrowReleaseTrigger = async () => {
      try {
        console.log("🔥 Triggering escrow auto release")

        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auto-release-escrow`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": "Auto_Release_Escrow_2026",
            },
            body: JSON.stringify({}),
          }
        )

        console.log("Escrow release status:", res.status)
        const text = await res.text()
        console.log("Escrow release response:", text)
      } catch (err) {
        console.log("Escrow release trigger error:", err)
      }
    }

    const runReturnAutoRefundTrigger = async () => {
      try {
        console.log("🔁 Triggering auto refund for returns")

        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auto-release-return`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": "Auto_Release_Escrow_2026",
            },
            body: JSON.stringify({}),
          }
        )

        console.log("Return auto refund status:", res.status)
        const text = await res.text()
        console.log("Return auto refund response:", text)
      } catch (err) {
        console.log("Return auto refund trigger error:", err)
      }
    }

    const runNonReturnReleaseTrigger = async () => {
      try {
        console.log("⏱️ Triggering non-return escrow release (no tracking uploaded)")

        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auto-non-return-release`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": "Auto_Release_Escrow_2026",
            },
            body: JSON.stringify({}),
          }
        )

        console.log("Non-return release status:", res.status)
        const text = await res.text()
        console.log("Non-return release response:", text)
      } catch (err) {
        console.log("Non-return release trigger error:", err)
      }
    }

    // 🔥 Fire all – do not block UI
    runEscrowReleaseTrigger()
    runReturnAutoRefundTrigger()
    runNonReturnReleaseTrigger()

    // Existing loads
    loadOrdersToShipCount()
    loadOrdersInProgressCount()
    loadUnreadMessagesCount()
    loadOffersActionCount()
    loadProStatus()

    return () => {}
  }, [sellerId])
)

/* ---------------- PRO STATUS ---------------- */

  const loadProStatus = async () => {
    if (!sellerId) return

    setProLoading(true)

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro, boosts_remaining")
        .eq("id", sellerId)
        .single()

      if (error) throw error

      setIsPro(!!data?.is_pro)
      setBoostsRemaining(Number(data?.boosts_remaining ?? 0))
    } catch (err) {
      setIsPro(false)
      setBoostsRemaining(0)
      handleAppError(err, {
        context: "seller_hub_load_pro_status",
        silent: true,
      })
    } finally {
      setProLoading(false)
    }
  }

  /* ---------------- ORDERS: NEED TO SHIP ---------------- */

  const loadOrdersToShipCount = async () => {
    if (!sellerId) return

    try {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .eq("seller_id", sellerId)

      setOrdersToShipCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "seller_hub_load_orders_to_ship_catch",
        silent: true,
      })
    }
  }

  /* ---------------- ORDERS: IN PROGRESS ---------------- */

  const loadOrdersInProgressCount = async () => {
    if (!sellerId) return

    try {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["shipped", "in_transit"])

      setOrdersInProgressCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "seller_hub_load_orders_in_progress_catch",
        silent: true,
      })
    }
  }

  /* ---------------- MESSAGES: UNREAD ---------------- */

  const loadUnreadMessagesCount = async () => {
    if (!sellerId) return

    try {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .eq("receiver_id", sellerId)

      setUnreadMessagesCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "seller_hub_load_unread_messages_catch",
        silent: true,
      })
    }
  }

  /* ---------------- OFFERS: ACTIONABLE ---------------- */

  const loadOffersActionCount = async () => {
    if (!sellerId) return

    try {
      const { count } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["pending", "countered"])
        .neq("last_actor", "seller")

      setOffersActionCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "seller_hub_load_offers_action_catch",
        silent: true,
      })
    }
  }

  const totalOrdersBadge = ordersToShipCount + ordersInProgressCount

  return (
    <View style={styles.screen}>
      <AppHeader title="Seller Hub" backLabel="Profile" backRoute="/profile" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FreeDashboardSection
          totalOrdersBadge={totalOrdersBadge}
          offersActionCount={offersActionCount}
          unreadMessagesCount={unreadMessagesCount}
        />

        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Pro Members</Text>
          <View style={styles.dividerLine} />
        </View>

        <ProBenefitsCard isPro={isPro} />

        {!isPro && (
          <UpgradeToProButton style={styles.upgradeButton} />
        )}

        <View style={styles.proWrap}>
          <ProDashboardSection
            userId={sellerId || ""}
            boostsRemaining={boostsRemaining}
            lastBoostReset={null}
            isPro={isPro}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/seller-hub/create-listing")}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={20} color="#0F1E17" />
        <Text style={styles.fabText}>Create Listing</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDE9E3",
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 20,
    fontWeight: "900",
    color: "#5F7D71",
  },
  upgradeButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  proWrap: {
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    bottom: 55,
    left: 24,
    right: 24,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#7FAF9B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  fabText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },
})