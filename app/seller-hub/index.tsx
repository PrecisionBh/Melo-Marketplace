import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native"

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

  const [proLoading, setProLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)

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
      loadProStatus()
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

  /* ---------------- OFFERS: ACTIONABLE ---------------- */

  const loadOffersActionCount = async () => {
    if (!sellerId) return

    try {
      const { count, error } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["pending", "countered"])
        .neq("last_actor", "seller")

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

  /* ---------------- COMBINED BADGES ---------------- */

  const totalOrdersBadge = ordersToShipCount + ordersInProgressCount

  return (
    <View style={styles.screen}>
      <AppHeader title="Seller Hub" backLabel="Profile" backRoute="/profile" />

      {/* ⭐ Melo Pro Banner */}
      <View style={styles.proWrap}>
        <TouchableOpacity
          style={[styles.proCard, isPro && styles.proCardPro]}
          activeOpacity={0.9}
          onPress={() => {
            if (isPro) {
              console.log("👑 Routing to Melo Pro Dashboard")
              router.push("/melo-pro/dashboard")
            } else {
              console.log("🚀 Routing to Melo Pro Upgrade")
              router.push("/melo-pro")
            }
          }}
        >
          <View style={styles.proLeft}>
            <View style={styles.proIconPill}>
              <Ionicons name="sparkles" size={16} color="#0F1E17" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>
                {isPro ? "Melo Dashboard 👑" : "Upgrade to Melo Pro"}
              </Text>

              {proLoading ? (
                <View style={styles.proLoadingRow}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.proSub}>Checking status…</Text>
                </View>
              ) : isPro ? (
                <Text style={styles.proSub}>
                  Boosts remaining:{" "}
                  <Text style={styles.proBold}>{boostsRemaining}</Text>
                </Text>
              ) : (
                <Text style={styles.proSub}>
                  Unlimited listings • 10 boosts/mo • Quantity selling
                </Text>
              )}
            </View>
          </View>

          <View style={styles.proRight}>
            {!isPro && <Text style={styles.proPrice}>$10/mo</Text>}
            <Ionicons name="chevron-forward" size={18} color="#0F1E17" />
          </View>
        </TouchableOpacity>
      </View>

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
          icon="wallet-outline"
          label="Wallet"
          onPress={() => router.push("/seller-hub/wallet")}
        />

        <MenuItem
          icon="document-text-outline"
          label="Payout History"
          onPress={() => router.push("/seller-hub/payout-history")}
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

  proWrap: {
    marginTop: 10,
    marginHorizontal: 12,
  },
  proCard: {
    backgroundColor: "#BFE7D4",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#A9D7C6",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  proCardPro: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6EFEA",
  },
  proLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  proIconPill: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  proTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
  },
  proSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
    opacity: 0.75,
  },
  proBold: {
    fontWeight: "900",
  },
  proLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  proRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 10,
  },
  proPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F1E17",
    opacity: 0.85,
    marginBottom: 2,
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