import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import ListingCard from "@/components/home/ListingCard"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 12

/* ---------------- TYPES ---------------- */

type Profile = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

type Listing = {
  id: string
  title: string
  price: number
  category: string
  image_urls: string[] | null
  allow_offers?: boolean
}

/* ---------------- SCREEN ---------------- */

export default function PublicProfileScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()

  // normalize param ONCE
  const userId =
    typeof params.userId === "string"
      ? params.userId
      : Array.isArray(params.userId)
      ? params.userId[0]
      : undefined

  const [profile, setProfile] = useState<Profile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const [ratingAvg, setRatingAvg] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [soldCount, setSoldCount] = useState(0)

  /* ---------------- EFFECT ---------------- */

  useEffect(() => {
    if (!userId) return
    loadProfile()
    loadRatings()
    loadSales()
    loadListings(true)
  }, [userId])

  /* ---------------- LOADERS ---------------- */

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, bio, avatar_url")
      .eq("id", userId)
      .single()

    setProfile(data ?? null)
    setLoading(false)
  }

  const loadRatings = async () => {
    const { data } = await supabase
      .from("ratings")
      .select("rating")
      .eq("to_user_id", userId)

    if (!data || data.length === 0) {
      setRatingAvg(null)
      setRatingCount(0)
      return
    }

    const total = data.reduce((sum, r) => sum + r.rating, 0)
    setRatingAvg(Number((total / data.length).toFixed(1)))
    setRatingCount(data.length)
  }

  const loadSales = async () => {
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", "completed")

    setSoldCount(count ?? 0)
  }

  const loadListings = async (reset = false) => {
    if (!userId || (!hasMore && !reset)) return

    const nextPage = reset ? 0 : page

    const { data } = await supabase
      .from("listings")
      .select(
        "id, title, price, category, image_urls, allow_offers"
      )
      .eq("user_id", userId)
      .eq("is_removed", false)
      .eq("is_sold", false)
      .order("created_at", { ascending: false })
      .range(
        nextPage * PAGE_SIZE,
        nextPage * PAGE_SIZE + PAGE_SIZE - 1
      )

    const rows: Listing[] = data ?? []

    if (reset) {
      setListings(rows)
      setPage(1)
      setHasMore(rows.length === PAGE_SIZE)
    } else {
      setListings((prev) => [...prev, ...rows])
      setPage((p) => p + 1)
      setHasMore(rows.length === PAGE_SIZE)
    }
  }

  /* ---------------- RENDER ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>User not found.</Text>
      </View>
    )
  }

  const hasReviews = ratingCount > 0

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 120 }}
        onEndReached={() => loadListings()}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No listings yet</Text>
        }
        ListHeaderComponent={
          <>
            {/* IDENTITY */}
            <View style={styles.identity}>
              <Image
                source={
                  profile.avatar_url
                    ? { uri: profile.avatar_url }
                    : require("../../../assets/images/avatar-placeholder.png")
                }
                style={styles.avatar}
              />

              <Text style={styles.name}>
                {profile.display_name ?? "User"}
              </Text>

              <View style={styles.statsRow}>
                <Stat
                  label="Rating"
                  value={hasReviews ? `${ratingAvg} ★` : "No reviews"}
                  sub={hasReviews ? `${ratingCount} reviews` : undefined}
                  muted={!hasReviews}
                />

                <Stat
                  label="Sold"
                  value={`${soldCount}`}
                  sub="completed"
                />
              </View>
            </View>

            {profile.bio && (
              <View style={styles.bioCard}>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Listings</Text>
          </>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={{
              ...item,
              image_url: item.image_urls?.[0] ?? null,
            }}
            onPress={() =>
              router.push({
                pathname: "/listing/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function Stat({
  label,
  value,
  sub,
  muted,
}: {
  label: string
  value: string
  sub?: string
  muted?: boolean
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statValue,
          muted && { color: "#9FB8AC" },
        ]}
      >
        {value}
      </Text>
      {sub && (
        <Text
          style={[
            styles.statSub,
            muted && { color: "#9FB8AC" },
          ]}
        >
          {sub}
        </Text>
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  identity: {
    alignItems: "center",
    paddingVertical: 20,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 10,
  },

  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  stat: {
    alignItems: "center",
    marginHorizontal: 14,
  },

  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  statSub: {
    fontSize: 12,
    color: "#6B8F7D",
  },

  bioCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
  },

  bioText: {
    color: "#0F1E17",
    lineHeight: 20,
  },

  sectionTitle: {
    marginTop: 20,
    marginLeft: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#6B8F7D",
  },
})
