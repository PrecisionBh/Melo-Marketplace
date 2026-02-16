import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  from_user_id: string
  review_tags: string[] | null
}

type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

/* ---------------- SCREEN ---------------- */

export default function ReviewsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const router = useRouter()

  const [reviews, setReviews] = useState<Review[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      setLoading(true)

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", userId)
        .single()

      setProfile(profileData ?? null)

      // Load reviews WITH tags
      const { data: reviewData } = await supabase
        .from("ratings")
        .select(
          "id, rating, comment, created_at, from_user_id, review_tags"
        )
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false })

      setReviews(reviewData ?? [])
      setLoading(false)
    }

    loadData()
  }, [userId])

  /* ---------------- STATS ---------------- */

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "0.0"
    const sum = reviews.reduce((a, b) => a + b.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }, [reviews])

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    reviews.forEach((review) => {
      review.review_tags?.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1
      })
    })

    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [reviews])

  const hasBadges = tagCounts.length > 0

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
  title="Reviews"
  backRoute={userId ? `/public-profile/${userId}` : "/profile"}
/>


      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={48} color="#7FAF9B" />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptyText}>
            This user hasn’t received any reviews yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              {/* PROFILE HEADER */}
              <View style={styles.profileHeader}>
                <Image
                  source={
                    profile?.avatar_url
                      ? { uri: profile.avatar_url }
                      : require("../../../assets/images/avatar-placeholder.png")
                  }
                  style={styles.avatar}
                />

                <Text style={styles.username}>
                  {profile?.display_name ?? "User"}
                </Text>

                {/* SUMMARY */}
                <View style={styles.summary}>
                  <Text style={styles.avg}>{averageRating} ★</Text>
                  <Text style={styles.count}>
                    {reviews.length} review
                    {reviews.length !== 1 ? "s" : ""}
                  </Text>
                </View>

                {/* SELLER HIGHLIGHTS */}
                {hasBadges && (
                  <View style={styles.badgeSection}>
                    <Text style={styles.badgeTitle}>
                      Seller Highlights
                    </Text>

                    <View style={styles.badgeWrap}>
                      {tagCounts.map(([tag, count]) => (
                        <View key={tag} style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {tag} • {count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* DIVIDER */}
                <View style={styles.dividerWrap}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>REVIEWS</Text>
                </View>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* STARS */}
              <View style={styles.ratingRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < item.rating ? "star" : "star-outline"}
                    size={16}
                    color="#F2C94C"
                  />
                ))}
              </View>

              {/* REVIEW TAGS (UNCHANGED) */}
              {item.review_tags && item.review_tags.length > 0 && (
                <View style={styles.tagWrap}>
                  {item.review_tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* COMMENT */}
              {item.comment && (
                <Text style={styles.comment}>{item.comment}</Text>
              )}

              {/* DATE */}
              <Text style={styles.date}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- STYLES (UNCHANGED) ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 10,
  },

  username: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  summary: {
    alignItems: "center",
    marginTop: 10,
  },

  avg: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0F1E17",
  },

  count: {
    fontSize: 13,
    color: "#6B8F7D",
  },

  badgeSection: {
    marginTop: 18,
    alignItems: "center",
    width: "100%",
  },

  badgeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F1E17",
    marginBottom: 10,
  },

  badgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 10,
    marginTop: 6,
  },

  badge: {
    backgroundColor: "#7FAF9B",
    borderRadius: 14,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
    margin: 6,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "42%",
    maxWidth: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
    textAlign: "center",
    lineHeight: 16,
  },

  dividerWrap: {
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  ratingRow: {
    flexDirection: "row",
    marginBottom: 6,
  },

  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },

  tag: {
    backgroundColor: "#F1F6F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },

  tagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F1E17",
  },

  comment: {
    fontSize: 14,
    color: "#0F1E17",
    marginBottom: 6,
  },

  date: {
    fontSize: 12,
    color: "#6B8F7D",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B8F7D",
    textAlign: "center",
  },
})
