import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import AppHeader from "@/components/app-header"
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
  const [disputesActionCount, setDisputesActionCount] = useState(0)

  /* ---------------- LOAD COUNTS ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (!sellerId) {
        handleAppError(new Error("Missing seller session"), {
          context: "seller_hub_no_session",
          silent: true,
        })
        return
      }

      loadOrdersToShipCount()
      loadOrdersInProgressCount()
      loadUnreadMessagesCount()
      loadOffersActionCount()
      loadDisputesActionCount()
    }, [sellerId])
  )

  /* ---------------- ORDERS: NEED TO SHIP ---------------- */

  const loadOrdersToShipCount = async () => {
    if (!sellerId) return

    try {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .eq("seller_id", sellerId)

      if (error) {
        handleAppError(error, {
          context: "seller_hub_load_orders_to_ship",
          silent: true,
        })
        return
      }

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
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["shipped", "in_transit"])

      if (error) {
        handleAppError(error, {
          context: "seller_hub_load_orders_in_progress",
          silent: true,
        })
        return
      }

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
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .eq("receiver_id", sellerId)

      if (error) {
        handleAppError(error, {
          context: "seller_hub_load_unread_messages",
          silent: true,
        })
        return
      }

      setUnreadMessagesCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "seller_hub_load_unread_messages_catch",
        silent: true,
      })
    }
  }

  /* ---------------- OFFERS: NEEDING SELLER ACTION ---------------- */

  const loadOffersActionCount = async () => {
    if (!sellerId) return

    try {
      const { count, error } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["pending", "countered"])

      if (error) {
        handleAppError(error, {
          context: "seller_hub_load_offers_action",
          silent: true,
        })
        return
      }

      setOffersActionCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "seller_hub_load_offers_action_catch",
        silent: true,
      })
    }
  }

  /* ---------------- DISPUTES: NEEDING SELLER RESPONSE (SCHEMA-ACCURATE) ---------------- */

  const loadDisputesActionCount = async () => {
    if (!sellerId) return

    try {
      const { count, error } = await supabase
        .from("disputes")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .is("resolved_at", null) // still active dispute
        .is("seller_responded_at", null) // seller has not responded yet (true action needed)

      if (error) {
        handleAppError(error, {
          context: "seller_hub_load_disputes_action",
          silent: true,
        })
        return
      }

      setDisputesActionCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "seller_hub_load_disputes_action_catch",
        silent: true,
      })
    }
  }

  /* ---------------- COMBINED BADGES ---------------- */

  const totalOrdersBadge = ordersToShipCount + ordersInProgressCount

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Seller Hub"
        backLabel="Profile"
        backRoute="/profile"
      />

      <View style={styles.menu}>
        <MenuItem
          icon="grid-outline"
          label="My Listings"
          onPress={() => router.push("/seller-hub/my-listings")}
        />

        <MenuItem
          icon="cube-outline"
          label="Orders"
          badgeCount={totalOrdersBadge}
          onPress={() => router.push("/seller-hub/orders")}
        />

        <MenuItem
          icon="pricetags-outline"
          label="Offers"
          badgeCount={offersActionCount}
          onPress={() => router.push("/seller-hub/offers")}
        />

        <MenuItem
          icon="alert-circle-outline"
          label="Disputes"
          badgeCount={disputesActionCount}
          onPress={() => router.push("/seller-hub/orders/disputes")}
        />

        <MenuItem
          icon="wallet-outline"
          label="Wallet"
          onPress={() => router.push("/seller-hub/wallet")}
        />

        <MenuItem
          icon="chatbubble-ellipses-outline"
          label="Messages"
          badgeCount={unreadMessagesCount}
          onPress={() => router.push("/messages")}
        />

        <MenuItem
          icon="settings-outline"
          label="Settings"
          onPress={() => router.push("/settings")}
        />
      </View>

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

/* ---------------- MENU ITEM ---------------- */

function MenuItem({
  icon,
  label,
  badgeCount,
  onPress,
}: {
  icon: any
  label: string
  badgeCount?: number
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F1E17" />
      <Text style={styles.menuText}>{label}</Text>

      <View style={{ flex: 1 }} />

      {typeof badgeCount === "number" && badgeCount > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{badgeCount}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={18} color="#9FB8AC" />
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
  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
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
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },
})
