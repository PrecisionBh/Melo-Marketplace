import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  from_user_id: string
  review_tags: string[] | null
}

export default function ProfileReviewsTab() {
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user?.id ?? null

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!userId) {
      setReviews([])
      setLoading(false)
      return
    }

    loadReviews()
  }, [userId, authLoading])

  const loadReviews = async () => {
    if (!userId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("ratings")
        .select(
          "id, rating, comment, created_at, from_user_id, review_tags"
        )
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setReviews((data as Review[]) ?? [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load reviews.",
        context: "profile_reviews_load",
      })
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "0.0"

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
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

  if (authLoading || loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#7FAF9B" />
      </View>
    )
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons
          name="star-outline"
          size={34}
          color="#9CA3AF"
          style={{ marginBottom: 10 }}
        />
        <Text style={styles.emptyTitle}>No reviews yet</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.summaryCard}>
        <Text style={styles.avgRating}>{averageRating} ★</Text>
        <Text style={styles.reviewCount}>
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {tagCounts.length > 0 && (
        <View style={styles.badgesWrap}>
          {tagCounts.map(([tag, count]) => (
            <View key={tag} style={styles.badge}>
              <Text style={styles.badgeText}>
                {tag} • {count}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.listWrap}>
        {reviews.map((review) => (
          <View key={review.id} style={styles.card}>
            <View style={styles.ratingRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < review.rating ? "star" : "star-outline"}
                  size={16}
                  color="#F2C94C"
                  style={{ marginRight: 2 }}
                />
              ))}
            </View>

            {review.review_tags && review.review_tags.length > 0 && (
              <View style={styles.tagWrap}>
                {review.review_tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {!!review.comment && (
              <Text style={styles.comment}>{review.comment}</Text>
            )}

            <Text style={styles.date}>
              {review.created_at
                ? new Date(review.created_at).toLocaleDateString()
                : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    paddingHorizontal: 20,
  },

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

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 22,
    alignItems: "center",
    marginBottom: 14,
  },

  avgRating: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
  },

  reviewCount: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },

  badge: {
    backgroundColor: "#F1F6F3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0ECE6",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
  },

  listWrap: {
    gap: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  ratingRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
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
    lineHeight: 20,
    marginBottom: 8,
  },

  date: {
    fontSize: 12,
    color: "#6B7280",
  },
})