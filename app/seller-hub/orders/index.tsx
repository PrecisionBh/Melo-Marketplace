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

  /* ---------------- LOAD COUNTS ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (!sellerId) return
      loadOrdersToShipCount()
      loadInProgressCount()
      loadOpenDisputesCount()
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

  const loadOpenDisputesCount = async () => {
    try {
      if (!sellerId) return

      const { count, error } = await supabase
        .from("disputes")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .is("resolved_at", null)

      if (error) throw error

      setOpenDisputesCount(count ?? 0)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load disputes count.",
      })
      setOpenDisputesCount(0)
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

      {/* 🔥 MELO PRO UPGRADE CTA (NEW – PREMIUM) */}
      <TouchableOpacity
        style={styles.proCard}
        activeOpacity={0.9}
        onPress={() => router.push("/melo-pro")}
      >
        <View style={styles.proGlow} />

        <View style={styles.proRow}>
          <View style={styles.proIconWrap}>
            <Ionicons name="diamond-outline" size={22} color="#FFD700" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>Upgrade to Melo Pro</Text>
            <Text style={styles.proSubtitle}>
              Unlimited listings • 10 boosts/month • Pro badge
            </Text>
          </View>

          <View style={styles.proPill}>
            <Text style={styles.proPillText}>GO PRO</Text>
          </View>
        </View>
      </TouchableOpacity>

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

  /* 🔥 MELO PRO CARD (DARK + GOLD LUXURY) */
  proCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#0B1511",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
  },

  proGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFD700",
    opacity: 0.08,
  },

  proRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  proIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,215,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  proTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  proSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },

  proPill: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  proPillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0B1511",
    letterSpacing: 1,
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