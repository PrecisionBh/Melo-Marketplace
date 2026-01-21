import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import { useAuth } from "@/context/AuthContext"
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
    if (!sellerId) return

    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .eq("seller_id", sellerId)

    setOrdersToShipCount(count ?? 0)
  }

  const loadInProgressCount = async () => {
    if (!sellerId) return

    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "shipped")
      .eq("seller_id", sellerId)

    setInProgressCount(count ?? 0)
  }

  const loadOpenDisputesCount = async () => {
    if (!sellerId) return

    const { count } = await supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("seller_id", sellerId)

    setOpenDisputesCount(count ?? 0)
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#E8F5EE" />
          <Text style={styles.backText}>Seller Hub</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Orders</Text>
      </View>

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

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  backBtn: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 6,
    color: "#E8F5EE",
    fontWeight: "600",
    fontSize: 13,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
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
