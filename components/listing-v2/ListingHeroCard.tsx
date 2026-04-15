import { Ionicons } from "@expo/vector-icons"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function ListingHeroCard({
  title,
  price,
  liked,
  likesCount,
  shippingType,
  shippingPrice,
  allowOffers,
  quantityAvailable,
  onToggleWatch,
}: {
  title: string
  price: number
  liked: boolean
  likesCount: number
  shippingType: "free" | "buyer_pays"
  shippingPrice?: number | null
  allowOffers: boolean
  quantityAvailable: number
  onToggleWatch: () => void
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.price}>
            ${price.toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.watchBtn}
          onPress={onToggleWatch}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={19}
            color={liked ? "#DC2626" : "#444"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.badges}>
        <Pill text={`${quantityAvailable} Available`} />

        {shippingType === "free" ? (
          <Pill text="Free Shipping" green />
        ) : (
          <Pill
            text={`Shipping $${(
              shippingPrice ?? 0
            ).toFixed(2)}`}
          />
        )}

        {allowOffers && (
          <Pill text="Offers Accepted" orange />
        )}
      </View>

      {likesCount > 0 && (
  <Text style={styles.likes}>
    {likesCount} {likesCount === 1 ? "Like" : "Likes"}
  </Text>
)}
    </View>
  )
}

function Pill({
  text,
  green,
  orange,
}: {
  text: string
  green?: boolean
  orange?: boolean
}) {
  return (
    <View
      style={[
        styles.pill,
        green && styles.greenPill,
        orange && styles.orangePill,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          green && styles.greenText,
          orange && styles.orangeText,
        ]}
      >
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
    backgroundColor: "#F8F8F8",
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  title: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    lineHeight: 25,
    marginBottom: 6,
  },

  price: {
    fontSize: 26,
    fontWeight: "800",
    color: "#D97732",
  },

  watchBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ECECEC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  pill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F1F1",
  },

  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555",
  },

  greenPill: {
    backgroundColor: "#DCFCE7",
  },

  greenText: {
    color: "#15803D",
  },

  orangePill: {
    backgroundColor: "#FFF7ED",
  },

  orangeText: {
    color: "#D97732",
  },

  likes: {
    marginTop: 12,
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
})