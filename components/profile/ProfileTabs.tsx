import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type TabKey =
  | "listings"
  | "sent"
  | "received"
  | "reviews"

type Props = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired"

type OfferRow = {
  status: OfferStatus
  created_at: string
  listings: {
    is_sold?: boolean | null
  } | null
}

const TABS: {
  key: TabKey
  label: string
}[] = [
  { key: "listings", label: "Listings" },
  { key: "sent", label: "Sent" },
  { key: "received", label: "Received" },
  { key: "reviews", label: "Reviews" },
]

export default function ProfileTabs({
  activeTab,
  onChange,
}: Props) {
  const { session } = useAuth()

  const [sentCount, setSentCount] = useState(0)
  const [receivedCount, setReceivedCount] =
    useState(0)
  const [loadingCounts, setLoadingCounts] =
    useState(false)

  const loadActionCounts = useCallback(async () => {
    if (!session?.user?.id) {
      setSentCount(0)
      setReceivedCount(0)
      return
    }

    try {
      setLoadingCounts(true)

      const [sentRes, receivedRes] =
        await Promise.all([
          supabase
            .from("offers")
            .select(`status, created_at, listings ( is_sold )`)
            .eq("buyer_id", session.user.id)
            .returns<OfferRow[]>(),
          supabase
            .from("offers")
            .select(`status, created_at, listings ( is_sold )`)
            .eq("seller_id", session.user.id)
            .returns<OfferRow[]>(),
        ])

      if (sentRes.error) throw sentRes.error
      if (receivedRes.error) throw receivedRes.error

      const sentOffers = sentRes.data ?? []
      const receivedOffers = receivedRes.data ?? []

      setSentCount(sentOffers.length)
      setReceivedCount(receivedOffers.length)
    } catch (error) {
      console.error("❌ Failed loading counts", error)
      setSentCount(0)
      setReceivedCount(0)
    } finally {
      setLoadingCounts(false)
    }
  }, [session?.user?.id])

  useFocusEffect(
    useCallback(() => {
      loadActionCounts()
    }, [loadActionCounts])
  )

  return (
    <View style={styles.wrapper}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key

        const badgeCount =
          tab.key === "sent"
            ? sentCount
            : tab.key === "received"
            ? receivedCount
            : 0

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.85}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
          >
            <View style={styles.tabInner}>
              <Text
                style={[
                  styles.tabText,
                  active && styles.activeTabText,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tab.label}
              </Text>

              {badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badgeCount}
                  </Text>
                </View>
              )}

              {loadingCounts &&
                (tab.key === "sent" ||
                  tab.key === "received") && (
                  <ActivityIndicator
                    size="small"
                    color="#D97732"
                    style={styles.badgeLoader}
                  />
                )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 22,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },

  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },

  activeTabText: {
    color: "#D97732", // 🔥 orange when active
    fontWeight: "700",
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: "#D97732",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  badgeLoader: {
    marginLeft: 2,
  },
})