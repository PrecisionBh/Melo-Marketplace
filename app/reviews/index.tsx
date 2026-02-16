import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"



/* ---------------- QUICK TAG OPTIONS ---------------- */

const QUICK_TAGS = [
  "Fast Shipper 🚀",
  "Great Communication 💬",
  "Item As Described 🎯",
  "Fair Negotiation 🤝",
  "Kind & Professional ⭐",
  "Well Packaged 📦",
  "Smooth Transaction ⚡",
  "Honest Seller ✔️",
]

/* ---------------- SCREEN ---------------- */

export default function LeaveReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [toUserId, setToUserId] = useState<string | null>(null)
  const [fromUserId, setFromUserId] = useState<string | null>(null)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  // FOLLOW STATES (ADDED)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!orderId) return

    const init = async () => {
      try {
        setLoading(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          Alert.alert("Error", "You must be logged in.")
          router.back()
          return
        }

        setFromUserId(user.id)

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

        // CHECK IF ALREADY FOLLOWING (ADDED)
        if (targetUserId) {
          const { data: followRow } = await supabase
            .from("followers")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", targetUserId)
            .maybeSingle()

          setIsFollowing(!!followRow)
        }

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
  handleAppError(err, {
    fallbackMessage: "Failed to load review page.",
  })
  router.back()
} finally {
        setLoading(false)
      }
    }

    init()
  }, [orderId])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag)
      }
      return [...prev, tag]
    })
  }

  // FOLLOW TOGGLE (ADDED)
  const handleFollowToggle = async () => {
    if (!toUserId || !fromUserId) return

    try {
      setFollowLoading(true)

      if (isFollowing) {
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", fromUserId)
          .eq("following_id", toUserId)

        if (!error) setIsFollowing(false)
      } else {
        const { error } = await supabase.from("followers").insert({
          follower_id: fromUserId,
          following_id: toUserId,
        })

        if (!error) setIsFollowing(true)
      }
    } catch (err) {
  handleAppError(err, {
    fallbackMessage: "Failed to update follow status.",
  })
}
finally {
      setFollowLoading(false)
    }
  }

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
        review_tags: selectedTags,
        comment: comment.trim() || null,
      })

      if (error) {
  handleAppError(error, {
    fallbackMessage: "Failed to submit review.",
  })
  return
}


      Alert.alert("Thank You!", "Your review has been submitted.")
      router.back()
    } catch (err) {
  handleAppError(err, {
    fallbackMessage: "Something went wrong while submitting your review.",
  })
}
 finally {
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
      <AppHeader
  title="Leave a Review"
/>


      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.card}>
          {/* RATING */}
          <Text style={styles.label}>Rate your experience</Text>

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

          {/* QUICK TAGS */}
          <Text style={styles.label}>Quick review (optional)</Text>

          <View style={styles.tagsWrap}>
            {QUICK_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag)
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    selected && styles.tagSelected,
                  ]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selected && styles.tagTextSelected,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* FOLLOW SELLER (ADDED - HIGH CONVERSION SPOT) */}
          {toUserId && (
            <View style={styles.followCard}>
              <Text style={styles.followTitle}>
                Liked this seller?
              </Text>
              <Text style={styles.followSubtitle}>
                Follow their listings to see future drops 🔔
              </Text>

              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
                onPress={handleFollowToggle}
                disabled={followLoading}
              >
                <Text style={styles.followButtonText}>
                  {followLoading
                    ? "Loading..."
                    : isFollowing
                    ? "Following"
                    : "Follow Seller"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* COMMENT */}
          <Text style={styles.label}>Optional comment</Text>

          <TextInput
            placeholder="How was your experience?"
            value={comment}
            onChangeText={setComment}
            style={styles.input}
            multiline
          />

          {/* SUBMIT */}
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
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
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
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  tag: {
    backgroundColor: "#F1F6F3",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0ECE6",
  },
  tagSelected: {
    backgroundColor: "#7FAF9B",
    borderColor: "#7FAF9B",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
  },
  tagTextSelected: {
    color: "#0F1E17",
  },

  // FOLLOW UI (ADDED)
  followCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F4F7F5",
    borderRadius: 14,
    alignItems: "center",
  },
  followTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },
  followSubtitle: {
    fontSize: 12,
    color: "#6B8F7D",
    marginTop: 4,
    marginBottom: 12,
    textAlign: "center",
  },
  followButton: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  followingButton: {
    backgroundColor: "#2E2E2E",
  },
  followButtonText: {
    color: "#0F1E17",
    fontWeight: "800",
    fontSize: 14,
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
