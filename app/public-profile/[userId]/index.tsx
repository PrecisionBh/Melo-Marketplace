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

import AppHeader from "@/components/app-header"
import ListingCard from "@/components/home/ListingCard"
import ProProfileHero from "@/components/prodashboard/ProProfileHero"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"


const PAGE_SIZE = 12

/* ---------------- TYPES ---------------- */

type Profile = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_pro?: boolean
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
  const { session } = useAuth()
  const currentUser = session?.user

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

  // FOLLOW STATES
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    loadProfile()
    loadRatings()
    loadSales()
    loadListings(true)
  }, [userId])

  // CHECK FOLLOW STATUS
  useEffect(() => {
    if (!userId || !currentUser) return

    const checkFollowStatus = async () => {
      const { data, error } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", userId)
        .maybeSingle()

      if (!error && data) {
        setIsFollowing(true)
      } else {
        setIsFollowing(false)
      }
    }

    checkFollowStatus()
  }, [userId, currentUser])

  /* ---------------- 🟢 MESSAGE SELLER (NEW) ---------------- */

  const handleMessageSeller = async () => {
    if (!session?.user || !userId) return

    const buyerId = session.user.id
    const sellerId = userId

    // Prevent messaging yourself
    if (buyerId === sellerId) return

    let conversationId: string | null = null

    // Check direct conversation
    const { data: direct } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_one", buyerId)
      .eq("user_two", sellerId)
      .order("created_at", { ascending: true })
      .limit(1)

    if (direct && direct.length > 0) {
      conversationId = direct[0].id
    } else {
      // Check reverse conversation
      const { data: reverse } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_one", sellerId)
        .eq("user_two", buyerId)
        .order("created_at", { ascending: true })
        .limit(1)

      if (reverse && reverse.length > 0) {
        conversationId = reverse[0].id
      }
    }

    // Create conversation if none exists
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          user_one: buyerId,
          user_two: sellerId,
        })
        .select("id")
        .single()

      if (error || !created) {
  handleAppError(error ?? new Error("Conversation creation failed"), {
    fallbackMessage: "Unable to start chat.",
  })
  return
}


      conversationId = created.id
    }

    // Open chat (no listingId since this is profile)
    router.push({
      pathname: "/messages/[id]",
      params: { id: conversationId! },
    })
  }

  const handleOpenReviews = () => {
    if (!userId || ratingCount === 0) return

    router.push({
      pathname: "/public-profile/[userId]/reviews",
      params: { userId },
    })
  }

  // FOLLOW TOGGLE FUNCTION
  const handleFollowToggle = async () => {
    if (!currentUser || !userId) return
    if (currentUser.id === userId) return

    try {
      setFollowLoading(true)

      if (isFollowing) {
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)

        if (!error) setIsFollowing(false)
      } else {
        const { error } = await supabase.from("followers").insert({
          follower_id: currentUser.id,
          following_id: userId,
        })

        if (!error) setIsFollowing(true)
      }
    } catch (err) {
  handleAppError(err, {
    fallbackMessage: "Failed to update follow status.",
  })
} finally {

      setFollowLoading(false)
    }
  }

  const loadProfile = async () => {
  try {
    if (!userId) return

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, bio, avatar_url, is_pro")
      .eq("id", userId)
      .single()

    if (error) throw error

    setProfile(data ?? null)
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Failed to load profile.",
    })
    setProfile(null)
  } finally {
    setLoading(false)
  }
}


  const loadRatings = async () => {
  try {
    if (!userId) return

    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("to_user_id", userId)

    if (error) throw error

    if (!data || data.length === 0) {
      setRatingAvg(null)
      setRatingCount(0)
      return
    }

    const total = data.reduce((sum, r) => sum + r.rating, 0)
    setRatingAvg(Number((total / data.length).toFixed(1)))
    setRatingCount(data.length)
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Failed to load ratings.",
    })
    setRatingAvg(null)
    setRatingCount(0)
  }
}


  const loadSales = async () => {
  try {
    if (!userId) return

    const { count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", "completed")

    if (error) throw error

    setSoldCount(count ?? 0)
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Failed to load sales data.",
    })
    setSoldCount(0)
  }
}


  const loadListings = async (reset = false) => {
  try {
    if (!userId || (!hasMore && !reset)) return

    const nextPage = reset ? 0 : page

    const { data, error } = await supabase
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

    if (error) throw error

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
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Failed to load listings.",
    })
  }
}


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
  const isOwnProfile = currentUser?.id === userId

  return (
  <View style={styles.screen}>
    {/* HEADER */}
    <AppHeader
      title="Profile"
      backLabel="Back"
      backRoute="/"
    />

    <FlatList
      data={listings}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 120,
      }}
      columnWrapperStyle={{
        justifyContent: "space-between",
        marginBottom: 16,
      }}
      onEndReached={() => loadListings()}
      onEndReachedThreshold={0.6}
      ListHeaderComponent={
        <>
          {/* 👑 PRO HERO OR BASIC PROFILE */}
          {profile.is_pro ? (
            <ProProfileHero
              displayName={profile.display_name}
              avatarUrl={profile.avatar_url}
              bio={profile.bio}
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowing}
              followLoading={followLoading}
              ratingAvg={ratingAvg}
              ratingCount={ratingCount}
              soldCount={soldCount}
              onFollowToggle={handleFollowToggle}
              onMessage={handleMessageSeller}
              onOpenReviews={handleOpenReviews}
            />
          ) : (
            <>
              {/* BASIC PROFILE (UNCHANGED) */}
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

                {/* 🟢 FOLLOW + MESSAGE (TWO COLUMN PILL ROW) */}
                {!isOwnProfile && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={handleFollowToggle}
                      disabled={followLoading}
                      style={[
                        styles.followButton,
                        isFollowing && styles.followingButton,
                      ]}
                    >
                      <Text style={styles.followButtonText}>
                        {followLoading
                          ? "Loading..."
                          : isFollowing
                          ? "Unfollow"
                          : "Follow Seller"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleMessageSeller}
                      style={styles.messageSellerButton}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.messageSellerText}>
                        Message Seller
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.statsRow}>
                  <TouchableOpacity
                    onPress={handleOpenReviews}
                    disabled={!hasReviews}
                    activeOpacity={hasReviews ? 0.7 : 1}
                  >
                    <Stat
                      label="Rating"
                      value={hasReviews ? `${ratingAvg} ★` : "No reviews"}
                      sub={
                        hasReviews
                          ? `${ratingCount} reviews`
                          : undefined
                      }
                      muted={!hasReviews}
                    />
                  </TouchableOpacity>

                  <Stat
                    label="Sold"
                    value={`${soldCount}`}
                    sub="completed"
                  />
                </View>
              </View>

              {profile.bio && (
                <View style={styles.bioCard}>
                  <Text style={styles.bioText}>
                    {profile.bio}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* GREEN DIVIDER (UNCHANGED) */}
          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>LISTINGS</Text>
          </View>
        </>
      }
      renderItem={({ item }) => (
        <View style={{ width: "48%" }}>
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
        </View>
      )}
    />
  </View>
)
}

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

      <Text
        style={[
          styles.statSub,
          muted && { color: "#9FB8AC" },
        ]}
      >
        {label}
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

  /* 🟢 NEW: Row that holds Follow + Message buttons */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },

  /* Follow button (left pill) */
  followButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  followingButton: {
    backgroundColor: "#2E2E2E",
  },

  followButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  /* 🟢 NEW: Message Seller button (right pill) */
  messageSellerButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
  },

  messageSellerText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
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
    textAlign: "center",
  },

  dividerWrap: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  dividerLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "#7FAF9B",
  },

  dividerText: {
    backgroundColor: "#EAF4EF",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 1,
  },
})
