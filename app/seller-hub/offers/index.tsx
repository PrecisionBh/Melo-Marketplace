import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "declined"

type Offer = {
  id: string
  current_amount: number
  counter_count: number
  status: OfferStatus
  listings: {
    id: string
    title: string
    image_urls: string[] | null
  }
}

/* ---------------- SCREEN ---------------- */

export default function SellerOffersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | OfferStatus>("pending")

  /* ---------------- LOAD OFFERS ---------------- */

  useFocusEffect(
    useCallback(() => {
      loadOffers()
    }, [session])
  )

  const loadOffers = async () => {
    if (!session?.user) return

    setLoading(true)

    const { data, error } = await supabase
      .from("offers")
      .select(`
        id,
        current_amount,
        counter_count,
        status,
        listings (
          id,
          title,
          image_urls
        )
      `)
      .eq("seller_id", session.user.id)
      .order("created_at", { ascending: false })
      .returns<Offer[]>()

    setOffers(data ?? [])
    setLoading(false)
  }

  /* ---------------- FILTERED DATA ---------------- */

  const filteredOffers = useMemo(() => {
    if (filter === "all") return offers
    return offers.filter((o) => o.status === filter)
  }, [offers, filter])

  /* ---------------- STATUS TEXT ---------------- */

  const getStatusText = (offer: Offer) => {
    switch (offer.status) {
      case "pending":
        return "Awaiting your response"
      case "countered":
        return "Negotiation ongoing"
      case "accepted":
        return "Accepted • Awaiting payment"
      case "declined":
        return "Declined"
      default:
        return ""
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
            <Text style={styles.headerSub}>Seller Hub</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Offers</Text>

          <View style={{ width: 60 }} />
        </View>

        {/* FILTER PILLS */}
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <FilterPill
              label="Pending"
              active={filter === "pending"}
              onPress={() => setFilter("pending")}
            />
            <FilterPill
              label="Countered"
              active={filter === "countered"}
              onPress={() => setFilter("countered")}
            />
            <FilterPill
              label="Accepted"
              active={filter === "accepted"}
              onPress={() => setFilter("accepted")}
            />
          </View>

          <View style={styles.filterRowCenter}>
            <FilterPill
              label="All"
              active={filter === "all"}
              onPress={() => setFilter("all")}
            />
            <FilterPill
              label="Declined"
              active={filter === "declined"}
              onPress={() => setFilter("declined")}
            />
          </View>
        </View>
      </View>

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : filteredOffers.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pricetag-outline" size={40} color="#7FAF9B" />
          <Text style={styles.emptyText}>No offers found</Text>
          <Text style={styles.emptySub}>
            Try selecting a different filter
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOffers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push(`../seller-hub/offers/${item.id}`)
              }
            >
              <Image
                source={{
                  uri:
                    item.listings.image_urls?.[0] ??
                    "https://via.placeholder.com/150",
                }}
                style={styles.image}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.listings.title}
                </Text>

                <Text style={styles.price}>
                  Offer: ${item.current_amount.toFixed(2)}
                </Text>

                <Text style={styles.meta}>
                  {getStatusText(item)}
                  {item.counter_count > 0 &&
                    ` • ${item.counter_count} counter${
                      item.counter_count === 1 ? "" : "s"
                    }`}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- FILTER PILL ---------------- */

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterPill,
        active && styles.filterPillActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },

  headerBtn: {
    alignItems: "center",
    minWidth: 60,
  },

  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#0F1E17",
  },

  /* FILTERS */
  filterContainer: {
    marginTop: 14,
    gap: 10,
  },

  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  filterRowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },

  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
  },

  filterPillActive: {
    backgroundColor: "#1F7A63",
  },

  filterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7A63",
  },

  filterTextActive: {
    color: "#ffffff",
  },

  /* EMPTY */
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B8F7D",
    textAlign: "center",
  },

  /* CARD */
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#D6E6DE",
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  price: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B8F7D",
  },
})
