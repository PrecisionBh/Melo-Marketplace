import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  sellerName: string | null
  isSellerPro?: boolean

  title: string
  price: number

  liked: boolean
  likesCount: number

  shippingType: "free" | "buyer_pays"
  shippingPrice: number | null

  allowOffers: boolean

  condition: string
  category: string
  brand: string | null
  description: string | null

  onToggleWatch: () => void
  onMakeOffer: () => void
  onBuyNow: () => void
}

export default function ListingInfoCard({
  sellerName,
  isSellerPro = false,

  title,
  price,

  liked,
  likesCount,

  shippingType,
  shippingPrice,

  allowOffers,

  condition,
  category,
  brand,
  description,

  onToggleWatch,
  onMakeOffer,
  onBuyNow,
}: Props) {
  const isFreeShipping = shippingType === "free"

  return (
    <View style={styles.card}>
      {/* SELLER ROW (TRUST FIRST - PREMIUM MARKETPLACE UX) */}
      <View style={styles.sellerRow}>
        <Text style={styles.sellerName}>
          {sellerName ?? "Seller"}
        </Text>

        {isSellerPro && (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>MELO PRO</Text>
          </View>
        )}
      </View>

      {/* TITLE + HEART */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.heartWrap}>
          <TouchableOpacity onPress={onToggleWatch} activeOpacity={0.8}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={26}
              color={liked ? "#FF4D4D" : "#6B8F7D"}
            />
          </TouchableOpacity>

          {likesCount > 0 && (
            <Text style={styles.likesText}>{likesCount}</Text>
          )}
        </View>
      </View>

      {/* PRICE (PRIMARY CONVERSION ELEMENT) */}
      <Text style={styles.price}>${price.toFixed(2)}</Text>

      {/* SHIPPING */}
      {isFreeShipping ? (
        <View style={styles.freeShippingBadge}>
          <Text style={styles.freeShippingText}>FREE SHIPPING</Text>
        </View>
      ) : (
        <Text style={styles.shippingText}>
          + ${shippingPrice ?? 0} shipping
        </Text>
      )}

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        {allowOffers && (
          <TouchableOpacity
            style={styles.offerBtn}
            onPress={onMakeOffer}
            activeOpacity={0.9}
          >
            <Text style={styles.offerText}>Make Offer</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.buyBtn}
          onPress={onBuyNow}
          activeOpacity={0.9}
        >
          <Text style={styles.buyText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      {/* DETAILS */}
      <Text style={styles.sectionTitle}>Details</Text>

      <DetailRow label="Condition" value={condition} />
      <DetailRow label="Category" value={category} />

      {brand && <DetailRow label="Brand" value={brand} />}

      {/* DESCRIPTION */}
      {description && description.trim().length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{description}</Text>
        </>
      )}
    </View>
  )
}

/* ---------- SUB COMPONENT ---------- */

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

/* ---------- STYLES (PREMIUM MELO DESIGN) ---------- */

const styles = StyleSheet.create({
  /* 🔥 FLOATING PREMIUM CARD */
  card: {
    marginTop: -24, // overlaps image for premium feel
    marginHorizontal: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  /* SELLER TRUST ROW */
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  sellerName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F1E17",
  },

  /* 🟢 MELO PRO BADGE (GLOWING TRUST BADGE) */
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#7FAF9B",

    shadowColor: "#7FAF9B",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  proBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 0.6,
  },

  /* TITLE + HEART */
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1E17",
    paddingRight: 10,
  },

  heartWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  likesText: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B8F7D",
    fontWeight: "700",
  },

  /* 💰 PRICE (HIGH EMPHASIS) */
  price: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 0.3,
  },

  /* 🔴 GLOWING FREE SHIPPING BADGE (MATCHES HOME BADGE STYLE) */
  freeShippingBadge: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFEAEA",

    shadowColor: "#FF3B3B",
    shadowOpacity: 0.65,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  freeShippingText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FF3B3B",
    letterSpacing: 0.8,
  },

  shippingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B8F7D",
    fontWeight: "600",
  },

  /* ACTION BUTTONS (BUY = PRIMARY) */
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  offerBtn: {
    flex: 0.9,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  offerText: {
    fontWeight: "900",
    color: "#0F1E17",
    fontSize: 14,
  },

  buyBtn: {
    flex: 1.1,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  buyText: {
    fontWeight: "900",
    color: "#FFFFFF",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  /* SECTIONS */
  sectionTitle: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3F0",
  },

  detailLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
    fontSize: 13,
  },

  detailValue: {
    color: "#0F1E17",
    fontWeight: "800",
    fontSize: 13,
  },

  description: {
    marginTop: 10,
    color: "#2E5F4F",
    lineHeight: 22,
    fontSize: 14,
  },
})