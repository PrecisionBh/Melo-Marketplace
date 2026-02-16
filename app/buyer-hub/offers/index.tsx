import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
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
  last_actor: "buyer" | "seller"
  listings: {
    id: string
    title: string
    image_urls: string[] | null
  }
}

/* ---------------- SCREEN ---------------- */

export default function BuyerOffersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------- LOAD OFFERS ---------------- */

  useFocusEffect(
    useCallback(() => {
      loadOffers()
    }, [session?.user?.id])
  )

  const loadOffers = async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from("offers")
      .select(`
        id,
        current_amount,
        counter_count,
        status,
        last_actor,
        listings (
          id,
          title,
          image_urls
        )
      `)
      .eq("buyer_id", session.user.id)
      .order("created_at", { ascending: false })
      .returns<Offer[]>()

    if (error) {
  handleAppError(error, {
    fallbackMessage: "Failed to load your offers. Please try again.",
  })
  setOffers([])
} else {
  setOffers(data ?? [])
}


    setLoading(false)
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
        title="My Offers"
        backLabel="Buyer Hub"
        backRoute="/buyer-hub"
      />

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : offers.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="pricetag-outline"
            size={40}
            color="#7FAF9B"
          />
          <Text style={styles.emptyText}>
            You haven’t made any offers yet
          </Text>
          <Text style={styles.emptySub}>
            When you submit offers, they’ll show up here
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const statusText =
              item.status === "accepted"
                ? "Accepted – Ready to pay"
                : item.status === "declined"
                ? "Declined"
                : item.last_actor === "seller"
                ? "Seller responded"
                : "Waiting on seller"

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push(`/buyer-hub/offers/${item.id}`)
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
                    {statusText} • {item.counter_count} counter
                    {item.counter_count === 1 ? "" : "s"}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

/* ---------------- STYLES (UNCHANGED) ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

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
    textAlign: "center",
  },

  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B8F7D",
    textAlign: "center",
  },

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
