import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired"

type Offer = {
  id: string
  current_amount: number
  counter_count: number
  status: OfferStatus
  created_at: string
  listings: {
    id: string
    title: string
    image_urls: string[] | null
    is_sold?: boolean
  }
}

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

function getDerivedStatus(offer: Offer) {
  // 🔥 FIX: don't override accepted offers
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

function getStatusText(offer: Offer) {
  const derivedStatus = getDerivedStatus(offer)

  if (derivedStatus === "expired") {
    return "Offer expired"
  }

  if (derivedStatus === "sold") {
    return "Item sold"
  }

  switch (derivedStatus) {
    case "pending":
      return "Awaiting your response"
    case "countered":
      return "Negotiation ongoing"
    case "accepted":
      return "Accepted • Awaiting payment"
    case "declined":
      return "Declined"
    case "cancelled":
      return "Cancelled"
    default:
      return ""
  }
}

// 🔥 SELLER ACTION REQUIRED
function getActionRequired(offer: Offer) {
  const derivedStatus = getDerivedStatus(offer)

  // Seller needs to respond
  if (
    derivedStatus === "pending" ||
    derivedStatus === "countered"
  ) {
    return "RESPOND"
  }

  return null
}

export default function ProfileReceivedOffersTab() {
  const router = useRouter()
  const {
    session,
    loading: authLoading,
  } = useAuth()

  const [offers, setOffers] = useState<
    Offer[]
  >([])
  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!session?.user) {
      setOffers([])
      setLoading(false)
      return
    }

    loadOffers()
  }, [session?.user?.id, authLoading])

  const loadOffers = async () => {
    try {
      if (!session?.user) {
        setOffers([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } =
        await supabase
          .from("offers")
          .select(`
            id,
            current_amount,
            counter_count,
            status,
            created_at,
            listings (
              id,
              title,
              image_urls,
              is_sold
            )
          `)
          .eq(
            "seller_id",
            session.user.id
          )
          .order("created_at", {
            ascending: false,
          })
          .returns<Offer[]>()

      if (error) throw error

      setOffers(data ?? [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load received offers.",
        context:
          "profile_received_offers_load",
      })

      setOffers([])
    } finally {
      setLoading(false)
    }
  }

  const visibleOffers = useMemo(
    () => offers,
    [offers]
  )

  if (authLoading || loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator
          size="large"
          color="#7FAF9B"
        />
      </View>
    )
  }

  if (visibleOffers.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons
          name="pricetag-outline"
          size={34}
          color="#9CA3AF"
          style={{ marginBottom: 10 }}
        />

        <Text style={styles.emptyTitle}>
          No offers received yet
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.listWrap}>
      {visibleOffers.map((offer) => {
        const derivedStatus =
          getDerivedStatus(offer)

        const actionRequired =
          getActionRequired(offer)

        const image =
          offer.listings?.image_urls?.[0] ??
          "https://via.placeholder.com/150"

        return (
          <TouchableOpacity
            key={offer.id}
            activeOpacity={0.9}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/offers/[id]",
                params: {
                  id: String(offer.id),
                },
              })
            }
          >
            <Image
              source={{ uri: image }}
              style={styles.image}
            />

            <View style={styles.infoWrap}>
              <Text
                style={styles.title}
                numberOfLines={2}
              >
                {offer.listings?.title ||
                  "Offer"}
              </Text>

              <Text style={styles.amount}>
                Offer: $
                {offer.current_amount.toFixed(
                  2
                )}
              </Text>

              <Text style={styles.meta}>
                {getStatusText(offer)}
                {offer.counter_count >
                  0 &&
                  ` • ${offer.counter_count} counter${
                    offer.counter_count ===
                    1
                      ? ""
                      : "s"
                  }`}
              </Text>
            </View>

            {/* SOLD */}
            {derivedStatus === "sold" && (
              <View style={styles.soldBadge}>
                <Text
                  style={styles.soldBadgeText}
                >
                  ITEM SOLD
                </Text>
              </View>
            )}

            {/* EXPIRED */}
            {derivedStatus === "expired" && (
              <View style={styles.expiredBadge}>
                <Text
                  style={styles.expiredBadgeText}
                >
                  OFFER EXPIRED
                </Text>
              </View>
            )}

            {/* 🔥 ACTION REQUIRED */}
            {actionRequired && (
              <View style={styles.actionBadge}>
                <Text
                  style={styles.actionBadgeText}
                >
                  {actionRequired}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingTop: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 34,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 14,
    color: "#6B7280",
  },

  listWrap: {
    marginTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#D6E6DE",
  },

  infoWrap: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  amount: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B8F7D",
    lineHeight: 17,
  },

  expiredBadge: {
    backgroundColor: "#C0392B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  expiredBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  soldBadge: {
    backgroundColor: "#6B7280",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  soldBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  actionBadge: {
    backgroundColor: "#D97732",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  actionBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },
})