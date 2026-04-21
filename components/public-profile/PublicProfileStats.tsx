import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

type Props = {
  soldCount: number
  ratingAvg: number | null
  ratingCount: number
}

const ORANGE = "#D97732"
const TEXT = "#0F1E17"

export default function PublicProfileStats({
  soldCount,
  ratingAvg,
  ratingCount,
}: Props) {
  return (
    <View style={styles.container}>
      {/* SOLD */}
      <Text style={styles.sold}>
        {soldCount} Sold
      </Text>

      {/* DOT */}
      <Text style={styles.dot}>•</Text>

      {/* RATING */}
      {ratingAvg ? (
        <View style={styles.ratingWrap}>
          <Text style={styles.ratingText}>
            {ratingAvg.toFixed(1)}
          </Text>

          <View style={styles.stars}>
            {renderStars(ratingAvg)}
          </View>

          <Text style={styles.count}>
            ({ratingCount})
          </Text>
        </View>
      ) : (
        <Text style={styles.noReviews}>
          No reviews
        </Text>
      )}
    </View>
  )
}

/* ⭐ STAR RENDER */
function renderStars(rating: number) {
  return [1, 2, 3, 4, 5].map((i) => {
    const filled = rating >= i
    const half = rating >= i - 0.5 && rating < i

    let color = "rgba(217,119,50,0.2)" // empty

    if (filled) {
      color = ORANGE
    } else if (half) {
      color = "rgba(217,119,50,0.6)"
    }

    return (
      <Ionicons
        key={i}
        name={
          filled
            ? "star"
            : half
            ? "star-half"
            : "star-outline"
        }
        size={14}
        color={color}
      />
    )
  })
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },

  sold: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },

  dot: {
    fontSize: 14,
    color: TEXT,
    opacity: 0.4,
  },

  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT,
  },

  stars: {
    flexDirection: "row",
    gap: 1,
  },

  count: {
    fontSize: 12,
    color: TEXT,
    opacity: 0.6,
  },

  noReviews: {
    fontSize: 12,
    color: TEXT,
    opacity: 0.6,
  },
})