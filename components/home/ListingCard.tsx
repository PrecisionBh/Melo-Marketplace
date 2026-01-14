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
  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* IMAGE */}
      {listing.image_url ? (
        <Image source={{ uri: listing.image_url }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={20} color="#9FB8AC" />
        </View>
      )}

      {/* PRICE */}
      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>${listing.price}</Text>
      </View>

      {/* SELLER ACTIONS */}
      {mode === "seller" && (
        <View style={styles.sellerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onEdit}
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
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#24352D",
    alignItems: "center",
    justifyContent: "center",
  },

  priceBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(15,30,23,0.85)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },

  priceText: {
    color: "#E8F5EE",
    fontSize: 11,
    fontWeight: "800",
  },

  /* SELLER UI */
  sellerActions: {
    position: "absolute",
    top: 6,
    right: 6,
    alignItems: "flex-end",
    gap: 6,
  },

  actionBtn: {
    backgroundColor: "rgba(0,0,0,0.65)",
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
})
