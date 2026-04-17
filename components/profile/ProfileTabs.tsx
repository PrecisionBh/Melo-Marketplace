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

const OFFER_EXPIRY_HOURS = 48

function isExpired(createdAt: string) {
  if (!createdAt) return false

  const createdTime = Date.parse(createdAt)
  if (isNaN(createdTime)) return false

  const now = Date.now()
  const diffMs = now - createdTime
  const expiryMs =
    OFFER_EXPIRY_HOURS * 60 * 60 * 1000

  return diffMs >= expiryMs
}

function getDerivedStatus(offer: OfferRow) {
  if (
    offer.listings?.is_sold &&
    offer.status !== "accepted"
  ) {
    return "sold"
  }

  if (
    (offer.status === "pending" ||
      offer.status === "accepted" ||
      offer.status === "countered") &&
    isExpired(offer.created_at)
  ) {
    return "expired"
  }

  return offer.status
}

function needsBuyerAction(offer: OfferRow) {
  const derivedStatus = getDerivedStatus(offer)

  return (
    derivedStatus === "accepted" ||
    derivedStatus === "countered"
  )
}

function needsSellerAction(offer: OfferRow) {
  const derivedStatus = getDerivedStatus(offer)

  return (
    derivedStatus === "pending" ||
    derivedStatus === "countered"
  )
}

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
            .select(
              `
              status,
              created_at,
              listings (
                is_sold
              )
            `
            )
            .eq("buyer_id", session.user.id)
            .returns<OfferRow[]>(),
          supabase
            .from("offers")
            .select(
              `
              status,
              created_at,
              listings (
                is_sold
              )
            `
            )
            .eq("seller_id", session.user.id)
            .returns<OfferRow[]>(),
        ])

      if (sentRes.error) {
        throw sentRes.error
      }

      if (receivedRes.error) {
        throw receivedRes.error
      }

      const sentOffers = sentRes.data ?? []
      const receivedOffers =
        receivedRes.data ?? []

      setSentCount(
        sentOffers.filter(needsBuyerAction).length
      )

      setReceivedCount(
        receivedOffers.filter(needsSellerAction)
          .length
      )
    } catch (error) {
      console.error(
        "❌ Failed loading offer action counts",
        error
      )
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
        const active =
          activeTab === tab.key

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
            style={[
              styles.tab,
              active && styles.activeTab,
            ]}
            onPress={() =>
              onChange(tab.key)
            }
          >
            <View style={styles.tabInner}>
              <Text
                style={[
                  styles.tabText,
                  active &&
                    styles.activeTabText,
                ]}
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
                  tab.key ===
                    "received") && (
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
    backgroundColor: "#ECE9E4",
    borderRadius: 22,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  activeTab: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },

  activeTabText: {
    color: "#111827",
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