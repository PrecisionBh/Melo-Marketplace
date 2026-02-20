import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function SellerOrdersHubScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const sellerId = session?.user?.id

  const [ordersToShipCount, setOrdersToShipCount] = useState(0)
  const [inProgressCount, setInProgressCount] = useState(0)
  const [openDisputesCount, setOpenDisputesCount] = useState(0)
  const [offersCount, setOffersCount] = useState(0)

  /* ---------------- LOAD COUNTS ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (!sellerId) return
      loadOrdersToShipCount()
      loadInProgressCount()
      loadOpenDisputesCount()
      loadOffersCount()
    }, [sellerId])
  )

  const loadOrdersToShipCount = async () => {
    try {
      if (!sellerId) return

      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .eq("seller_id", sellerId)

      if (error) throw error

      setOrdersToShipCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load orders to ship count.",
      })
      setOrdersToShipCount(0)
    }
  }

  const loadInProgressCount = async () => {
    try {
      if (!sellerId) return

      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["shipped", "delivered"])

      if (error) throw error

      setInProgressCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load in-progress orders count.",
      })
      setInProgressCount(0)
    }
  }

  /* ✅ FIXED: TRUE OPEN DISPUTES (ANY UNRESOLVED) */
  const loadOpenDisputesCount = async () => {
    try {
      if (!sellerId) return

      const { count, error } = await supabase
        .from("disputes")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .is("resolved_at", null) // ← CORRECT for your schema

      if (error) throw error

      setOpenDisputesCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load disputes count.",
      })
      setOpenDisputesCount(0)
    }
  }

  const loadOffersCount = async () => {
    try {
      if (!sellerId) return

      const { count, error } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["pending", "countered"])
        .neq("last_actor", "seller")

      if (error) throw error

      setOffersCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load offers count.",
      })
      setOffersCount(0)
    }
  }

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED MELO HEADER */}
      <AppHeader
        title="Orders"
        backLabel="Seller Hub"
        backRoute="/seller-hub"
      />

      {/* MENU */}
      <View style={styles.menu}>
        <MenuItem
          icon="cube-outline"
          label="Orders to Ship"
          badgeCount={ordersToShipCount}
          badgeColor="red"
          onPress={() =>
            router.push("/seller-hub/orders/orders-to-ship")
          }
        />

        <MenuItem
          icon="time-outline"
          label="In Progress"
          badgeCount={inProgressCount}
          badgeColor="blue"
          onPress={() =>
            router.push("/seller-hub/orders/in-progress")
          }
        />

        <MenuItem
          icon="pricetag-outline"
          label="Offers"
          badgeCount={offersCount}
          badgeColor="red"
          onPress={() =>
            router.push("/seller-hub/offers")
          }
        />

        <MenuItem
          icon="checkmark-done-outline"
          label="Completed Orders"
          onPress={() =>
            router.push("/seller-hub/orders/completed")
          }
        />

        <MenuItem
          icon="alert-circle-outline"
          label="Disputes"
          badgeCount={openDisputesCount}
          badgeColor="red"
          onPress={() =>
            router.push("/seller-hub/orders/disputes")
          }
        />
      </View>
    </View>
  )
}

/* ---------------- MENU ITEM ---------------- */

function MenuItem({
  icon,
  label,
  badgeCount,
  badgeColor = "red",
  onPress,
}: {
  icon: any
  label: string
  badgeCount?: number
  badgeColor?: "red" | "blue"
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F1E17" />
      <Text style={styles.menuText}>{label}</Text>

      <View style={{ flex: 1 }} />

      {typeof badgeCount === "number" && badgeCount > 0 && (
        <View
          style={[
            styles.countBadge,
            badgeColor === "blue" && styles.blueBadge,
          ]}
        >
          <Text style={styles.countText}>{badgeCount}</Text>
        </View>
      )}

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9FB8AC"
      />
    </TouchableOpacity>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  menu: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEA",
  },

  menuText: {
    marginLeft: 14,
    fontSize: 15,
    color: "#0F1E17",
    fontWeight: "500",
  },

  countBadge: {
    backgroundColor: "#EB5757",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  blueBadge: {
    backgroundColor: "#2F80ED",
  },

  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
})
