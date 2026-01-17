import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  from_user_id: string
}

/* ---------------- SCREEN ---------------- */

export default function ReviewsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const router = useRouter()

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const loadReviews = async () => {
      setLoading(true)

      const { data } = await supabase
        .from("ratings")
        .select("id, rating, comment, created_at, from_user_id")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false })

      setReviews(data ?? [])
      setLoading(false)
    }

    loadReviews()
  }, [userId])

  /* ---------------- STATS ---------------- */

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((a, b) => a + b.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }, [reviews])

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reviews</Text>

        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="star-outline"
            size={48}
            color="#7FAF9B"
          />
          <Text style={styles.emptyTitle}>
            No reviews yet
          </Text>
          <Text style={styles.emptyText}>
            This user hasn’t received any reviews yet.
          </Text>
        </View>
      ) : (
        <>
          {/* SUMMARY */}
          <View style={styles.summary}>
            <Text style={styles.avg}>
              {averageRating} ★
            </Text>
            <Text style={styles.count}>
              {reviews.length} review
              {reviews.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* LIST */}
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.ratingRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name={
                        i < item.rating
                          ? "star"
                          : "star-outline"
                      }
                      size={16}
                      color="#F2C94C"
                    />
                  ))}
                </View>

                {item.comment && (
                  <Text style={styles.comment}>
                    {item.comment}
                  </Text>
                )}

                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

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

  summary: {
    alignItems: "center",
    paddingVertical: 20,
  },

  avg: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0F1E17",
  },

  count: {
    fontSize: 13,
    color: "#6B8F7D",
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  ratingRow: {
    flexDirection: "row",
    marginBottom: 6,
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
