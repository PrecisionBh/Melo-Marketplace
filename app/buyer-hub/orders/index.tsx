import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

export default function BuyerOrdersHubScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const buyerId = session?.user?.id

  const [inProgressCount, setInProgressCount] = useState(0)
  const [openDisputesCount, setOpenDisputesCount] = useState(0)

  /* ---------------- LOAD COUNTS ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (!buyerId) return
      loadInProgressCount()
      loadOpenDisputesCount()
    }, [buyerId])
  )

  const loadInProgressCount = async () => {
    if (!buyerId) return

    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .in("status", ["paid", "shipped", "delivered"])

    setInProgressCount(count ?? 0)
  }

  const loadOpenDisputesCount = async () => {
    if (!buyerId) return

    const { count } = await supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyerId)
      .eq("status", "open")

    setOpenDisputesCount(count ?? 0)
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="My Orders"
        backLabel="Buyer Hub"
        backRoute="/buyer-hub"
      />

      {/* MENU */}
      <View style={styles.menu}>
        <MenuItem
          icon="time-outline"
          label="In Progress"
          badgeCount={inProgressCount}
          badgeColor="blue"
          onPress={() => router.push("/buyer-hub/orders/in-progress")}
        />

        <MenuItem
          icon="checkmark-done-outline"
          label="Completed"
          onPress={() => router.push("/buyer-hub/orders/completed")}
        />

        <MenuItem
          icon="alert-circle-outline"
          label="Disputes"
          badgeCount={openDisputesCount}
          badgeColor="red"
          onPress={() => router.push("/buyer-hub/orders/disputes")}
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
