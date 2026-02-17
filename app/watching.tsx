import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useRef, useState } from "react"
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
import { handleAppError } from "../lib/errors/appError"
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

  // Prevent state updates after unmount (important for focus screens)
  const mountedRef = useRef(true)

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true
      loadWatching()

      return () => {
        mountedRef.current = false
      }
    }, [session?.user?.id])
  )

  /* ---------------- LOAD WATCHING (HARDENED) ---------------- */

  const loadWatching = async () => {
    if (!session?.user?.id) {
      setListings([])
      setLoading(false)
      return
    }

    try {
      if (mountedRef.current) setLoading(true)

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

      if (error) {
        throw error
      }

      // Defensive: listing join can return null if listing was deleted
      const clean: WatchedListing[] = (data ?? [])
        .map((w: any) => w?.listing)
        .filter(
          (l: WatchedListing | null) =>
            l &&
            !l.is_sold &&
            l.id &&
            typeof l.price === "number"
        )

      if (mountedRef.current) {
        setListings(clean)
      }
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load watched listings. Please try again.",
      })

      // Fail safe UI instead of infinite spinner
      if (mountedRef.current) {
        setListings([])
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
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
                  ${Number(item.price).toFixed(2)}
                </Text>

                <Text style={styles.shipping}>
                  {item.shipping_type === "free"
                    ? "Free shipping"
                    : `+ $${Number(item.shipping_price ?? 0).toFixed(2)} shipping`}
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
