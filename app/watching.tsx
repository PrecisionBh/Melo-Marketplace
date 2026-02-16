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
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

type WatchedListing = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  shipping_type: "free" | "buyer_pays"
  shipping_price: number | null
  is_sold?: boolean
}

export default function WatchingScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [listings, setListings] = useState<WatchedListing[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      loadWatching()
    }, [])
  )

  /* ---------------- LOAD WATCHING ---------------- */

  const loadWatching = async () => {
    if (!session?.user) return

    setLoading(true)

    const { data, error } = await supabase
      .from("watchlist")
      .select(
        `
        listing:listings (
          id,
          title,
          price,
          image_urls,
          shipping_type,
          shipping_price,
          is_sold
        )
      `
      )
      .eq("user_id", session.user.id)

    if (!error && data) {
      const clean = data
        .map((w: any) => w.listing)
        .filter((l: WatchedListing) => l && !l.is_sold)

      setListings(clean)
    }

    setLoading(false)
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Watching"
        backLabel="Profile"
        backRoute="/profile"
      />

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={40} color="#7FAF9B" />
          <Text style={styles.emptyText}>No watched listings</Text>
          <Text style={styles.emptySub}>
            Tap the heart on a listing to watch it
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/listing/${item.id}`)}
            >
              <Image
                source={{
                  uri:
                    item.image_urls?.[0] ??
                    "https://via.placeholder.com/150",
                }}
                style={styles.image}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>

                <Text style={styles.price}>
                  ${item.price.toFixed(2)}
                </Text>

                <Text style={styles.shipping}>
                  {item.shipping_type === "free"
                    ? "Free shipping"
                    : `+ $${item.shipping_price} shipping`}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  /* (Old header styles kept but unused — safe to keep during polish phase) */
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
    color: "#0F1E17",
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

  shipping: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B8F7D",
  },
})
