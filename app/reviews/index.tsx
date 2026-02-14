import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { supabase } from "@/lib/supabase"

/* ---------------- SCREEN ---------------- */

export default function LeaveReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [toUserId, setToUserId] = useState<string | null>(null)
  const [fromUserId, setFromUserId] = useState<string | null>(null)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  useEffect(() => {
    if (!orderId) return

    const init = async () => {
      try {
        setLoading(true)

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          Alert.alert("Error", "You must be logged in.")
          router.back()
          return
        }

        setFromUserId(user.id)

        // Fetch order
        const { data: order, error } = await supabase
          .from("orders")
          .select("id, buyer_id, seller_id")
          .eq("id", orderId)
          .single()

        if (error || !order) {
          Alert.alert("Error", "Order not found.")
          router.back()
          return
        }

        // Determine who we are reviewing
        let targetUserId: string | null = null

        if (user.id === order.buyer_id) {
          targetUserId = order.seller_id
        } else if (user.id === order.seller_id) {
          targetUserId = order.buyer_id
        } else {
          Alert.alert("Unauthorized", "You cannot review this order.")
          router.back()
          return
        }

        setToUserId(targetUserId)

        // Check if already reviewed
        const { data: existing } = await supabase
          .from("ratings")
          .select("id")
          .eq("order_id", orderId)
          .eq("from_user_id", user.id)
          .maybeSingle()

        if (existing) {
          setAlreadyReviewed(true)
        }
      } catch (err) {
        console.log("Review init error:", err)
        Alert.alert("Error", "Failed to load review page.")
        router.back()
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [orderId])

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Select Rating", "Please select a star rating.")
      return
    }

    if (!toUserId || !fromUserId) return

    try {
      setSubmitting(true)

      const { error } = await supabase.from("ratings").insert({
        order_id: orderId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        rating,
        comment: comment.trim() || null,
      })

      if (error) {
        console.log("Insert review error:", error)
        Alert.alert("Error", "Failed to submit review.")
        return
      }

      Alert.alert("Thank You!", "Your review has been submitted.")
      router.back()
    } catch (err) {
      console.log(err)
      Alert.alert("Error", "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 100 }} />
  }

  if (alreadyReviewed) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={60} color="#7FAF9B" />
        <Text style={styles.title}>Review Already Submitted</Text>
        <Text style={styles.subtitle}>
          You have already left a review for this order.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Leave a Review</Text>

        <View style={{ width: 22 }} />
      </View>

      {/* CONTENT */}
      <View style={styles.card}>
        <Text style={styles.label}>Rate your experience</Text>

        {/* STARS */}
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={36}
                color="#F2C94C"
                style={{ marginHorizontal: 6 }}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Optional comment</Text>

        <TextInput
          placeholder="How was your experience?"
          value={comment}
          onChangeText={setComment}
          style={styles.input}
          multiline
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Submitting..." : "Submit Review"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
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
  card: {
    margin: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F1E17",
    marginBottom: 10,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F4F7F5",
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#7FAF9B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#0F1E17",
    fontWeight: "800",
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B8F7D",
    textAlign: "center",
  },
})
