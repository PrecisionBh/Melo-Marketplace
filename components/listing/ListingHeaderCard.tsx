import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  sellerName: string | null
  isSellerPro: boolean
  sellerRatingAvg: number | null
  sellerRatingCount: number
  title: string
  price: number
  liked: boolean
  likesCount: number
  shippingType: "free" | "buyer_pays"
  shippingPrice: number | null
  allowOffers: boolean
  onToggleWatch: () => void
  onMakeOffer: () => void
  onBuyNow: () => void
}

export default function ListingHeaderCard({
  sellerName,
  isSellerPro,
  sellerRatingAvg,
  sellerRatingCount,
  title,
  price,
  liked,
  likesCount,
  shippingType,
  shippingPrice,
  allowOffers,
  onToggleWatch,
  onMakeOffer,
  onBuyNow,
}: Props) {
  return (
    <View style={styles.card}>
      {/* SELLER ROW */}
      <View style={styles.sellerRow}>
        <View style={styles.sellerLeft}>
          <Text style={styles.sellerName}>
            {sellerName ?? "Seller"}
          </Text>

          {isSellerPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>MELO PRO</Text>
            </View>
          )}

          {sellerRatingCount > 0 && (
            <Text style={styles.rating}>
              {sellerRatingAvg} ★ ({sellerRatingCount})
            </Text>
          )}
        </View>
      </View>

      {/* TITLE + HEART */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>

        <View style={{ alignItems: "center" }}>
          <TouchableOpacity onPress={onToggleWatch}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={26}
              color={liked ? "#7FAF9B" : "#6B8F7D"}
            />
          </TouchableOpacity>

          {likesCount > 0 && (
            <Text style={styles.likesText}>{likesCount}</Text>
          )}
        </View>
      </View>

      {/* PRICE */}
      <Text style={styles.price}>${price.toFixed(2)}</Text>

      {/* 🔥 FREE SHIPPING GLOW BADGE */}
      {shippingType === "free" ? (
        <View style={styles.freeShippingBadge}>
          <Text style={styles.freeShippingText}>
            🚚 FREE SHIPPING
          </Text>
        </View>
      ) : (
        <Text style={styles.shipping}>
          + ${shippingPrice ?? 0} shipping
        </Text>
      )}

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        {allowOffers && (
          <TouchableOpacity style={styles.offerBtn} onPress={onMakeOffer}>
            <Text style={styles.offerText}>Make Offer</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.buyBtn} onPress={onBuyNow}>
          <Text style={styles.buyText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 22,
    padding: 18,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  sellerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  sellerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F1E17",
  },

  proBadge: {
    backgroundColor: "#0F1E17",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },

  proText: {
    color: "#7FAF9B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  rating: {
    fontSize: 12,
    color: "#6B8F7D",
    fontWeight: "600",
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1E17",
  },

  likesText: {
    fontSize: 12,
    color: "#6B8F7D",
    fontWeight: "700",
  },

  price: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: "900",
    color: "#0F1E17",
  },

  freeShippingBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#FF3B30",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  freeShippingText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.6,
  },

  shipping: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B8F7D",
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  offerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  offerText: {
    fontWeight: "900",
    color: "#0F1E17",
  },

  buyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
  },

  buyText: {
    fontWeight: "900",
    color: "#FFFFFF",
  },
})