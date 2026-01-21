import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

export default function SellerHubScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const sellerId = session?.user?.id

  const [ordersToShipCount, setOrdersToShipCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  /* ---------------- LOAD COUNTS ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (!sellerId) return
      loadOrdersToShipCount()
      loadUnreadMessagesCount()
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

  const loadUnreadMessagesCount = async () => {
    if (!sellerId) return

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .eq("receiver_id", sellerId)

    setUnreadMessagesCount(count ?? 0)
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="arrow-back" size={20} color="#E8F5EE" />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Seller Hub</Text>
      </View>

      {/* MENU */}
      <View style={styles.menu}>
        <MenuItem
          icon="grid-outline"
          label="My Listings"
          onPress={() => router.push("/seller-hub/my-listings")}
        />

        <MenuItem
          icon="cube-outline"
          label="Orders"
          badgeCount={ordersToShipCount}
          onPress={() => router.push("/seller-hub/orders")}
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

      {/* FLOATING CREATE LISTING BUTTON */}
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

      {/* PUSH CONTENT RIGHT */}
      <View style={{ flex: 1 }} />

      {/* BADGE */}
      {typeof badgeCount === "number" && badgeCount > 0 && (
        <View style={styles.countBadge}>
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
