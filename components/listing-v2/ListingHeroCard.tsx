import { Ionicons } from "@expo/vector-icons"
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import ShareListingButton from "@/components/listing-v2/ShareListingButton"

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
  listingId,
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
  listingId: string
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.price}>
            ${price.toLocaleString()}
          </Text>
        </View>

        {/* 🔥 ACTION ICONS */}
        <View style={styles.actions}>
          <ShareListingButton listingId={listingId} />

          <TouchableOpacity
            onPress={onToggleWatch}
            activeOpacity={0.6}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#D97732" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.badges}>
        <Pill text={`${quantityAvailable} Available`} />

        {shippingType === "free" ? (
          <Pill text="Free Shipping" highlight />
        ) : (
          <Pill
            text={`Shipping $${(
              shippingPrice ?? 0
            ).toFixed(2)}`}
          />
        )}

        {allowOffers && (
          <Pill text="Offers Accepted" highlight />
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
  highlight,
}: {
  text: string
  highlight?: boolean
}) {
  return (
    <View
      style={[
        styles.pill,
        highlight && styles.orangePill,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          highlight && styles.orangeText,
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

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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

  orangePill: {
    backgroundColor: "#FFF4ED",
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