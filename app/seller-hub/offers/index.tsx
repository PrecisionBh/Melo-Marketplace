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

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type OfferStatus = "pending" | "countered"

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
      .in("status", ["pending", "countered"])
      .order("created_at", { ascending: false })
      .returns<Offer[]>() // 👈 TS FIX

    if (error) {
      console.error("Error loading offers:", error)
      setOffers([])
    } else {
      setOffers(data ?? [])
    }

    setLoading(false)
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
      </View>

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
          <Text style={styles.emptyText}>No offers yet</Text>
          <Text style={styles.emptySub}>
            When buyers make offers, they’ll appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
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
                  {item.status === "pending"
                    ? "Awaiting your response"
                    : "Countered"}{" "}
                  • {item.counter_count} counter
                  {item.counter_count === 1 ? "" : "s"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  /* 🌿 HEADER */
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 50,
    paddingBottom: 12,
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
