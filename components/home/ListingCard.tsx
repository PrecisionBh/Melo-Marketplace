import { Ionicons } from "@expo/vector-icons"
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export type Listing = {
  id: string
  title: string
  price: number
  category: string
  image_url: string | null
  allow_offers?: boolean
  shipping_type?: "seller_pays" | "buyer_pays" | null
}

type Props = {
  listing: Listing
  mode?: "buyer" | "seller"
  onEdit?: () => void
  onPress?: () => void
}

export default function ListingCard({
  listing,
  mode = "buyer",
  onEdit,
  onPress,
}: Props) {
  const showFreeShipping =
    listing.shipping_type === "seller_pays"

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* IMAGE WRAP */}
      <View style={styles.imageWrap}>
        {listing.image_url ? (
          <Image
            source={{ uri: listing.image_url }}
            style={styles.image}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name="image-outline"
              size={22}
              color="#9FB8AC"
            />
          </View>
        )}

  {/* FREE SHIPPING BADGE (CLEAR + CLEAN) */}
{showFreeShipping && (
  <View style={styles.freeShipBadge}>
    <Text style={styles.freeShipText}>
      Free Shipping
    </Text>
  </View>
)}


        {/* SELLER ACTIONS */}
        {mode === "seller" && (
          <View style={styles.sellerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            {listing.allow_offers && (
              <View style={styles.offerBadge}>
                <Text style={styles.offerText}>Offers</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* TEXT BELOW IMAGE */}
      <View style={styles.meta}>
        <Text
  style={styles.title}
  numberOfLines={2}        // 🔒 HARD LOCK: never exceeds 2 lines
  ellipsizeMode="tail"     // Adds ... if too long
>
  {listing.title?.trim()}
</Text>


        <Text style={styles.price}>
          ${listing.price}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
  flex: 1,
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  overflow: "hidden",

  // 🔥 uniform shrink (keeps badges, text, image proportional)
  transform: [{ scale: 0.97 }],

  // ❌ no margin (prevents double spacing)
  margin: 0,

  // subtle depth so tight grid still looks premium
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
},


  /* IMAGE */
  imageWrap: {
    position: "relative",
    aspectRatio: 1,
    backgroundColor: "#24352D",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* FREE SHIPPING (CLEAR + COMPACT) */
freeShipBadge: {
  position: "absolute",
  top: 6,
  left: 6,
  backgroundColor: "#FFFFFF",
  borderRadius: 8,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderWidth: 1,
  borderColor: "#EB5757",
},

freeShipText: {
  fontSize: 9, // smaller for dense 3-column layout
  fontWeight: "800",
  color: "#EB5757",
  letterSpacing: 0.2, // subtle premium feel
},


  /* SELLER */
  sellerActions: {
    position: "absolute",
    top: 6,
    right: 6,
    gap: 6,
    alignItems: "flex-end",
  },

  actionBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  offerBadge: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  offerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F1E17",
  },

  /* META */
  meta: {
    padding: 8,
    gap: 4,
  },

  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
  },

  price: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F1E17",
  },
})
