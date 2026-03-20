import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import {
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
  condition?: string | null
  description?: string | null
  brand?: string | null
  image_url: string | null
  allow_offers?: boolean
  shipping_type?: "seller_pays" | "buyer_pays" | null
}

type Props = {
  listing: Listing
  mode?: "buyer" | "seller"
  onEdit?: () => void
  onPress?: () => void
  isMegaBoost?: boolean
  megaHero?: boolean
}

export default function ListingCard({
  listing,
  mode = "buyer",
  onEdit,
  onPress,
  isMegaBoost = false,
  megaHero = false,
}: Props) {

  const showFreeShipping =
    listing.shipping_type === "seller_pays"

  const isHero = isMegaBoost || megaHero

  const imageUri =
    listing.image_url && listing.image_url.trim() !== ""
      ? listing.image_url
      : null

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isHero && styles.heroCard,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* IMAGE WRAP */}
      <View
        style={[
          styles.imageWrap,
          isMegaBoost && styles.megaGlowWrap,
        ]}
      >
        {imageUri ? (
          <Image
            source={imageUri}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={100}
            onError={(e) => {
             
            }}
            onLoad={() => {
            }}
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

        {/* MEGA BOOST BADGE */}
        {isMegaBoost && (
          <View
            style={[
              styles.megaBoostBadge,
              isHero && styles.megaBoostBadgeHero,
            ]}
          >
            <Text
              style={[
                styles.megaBoostText,
                isHero && styles.megaBoostTextHero,
              ]}
            >
              Mega Boosted
            </Text>
          </View>
        )}

        {/* FREE SHIPPING BADGE */}
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
      <View
        style={[
          styles.meta,
          isHero && styles.metaHero,
        ]}
      >
        <Text
          style={[
            styles.title,
            isHero && styles.titleHero,
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {listing.title?.trim()}
        </Text>

        <Text
          style={[
            styles.price,
            isHero && styles.priceHero,
          ]}
        >
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
    transform: [{ scale: 0.97 }],
    margin: 0,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  heroCard: {
    transform: [{ scale: 1 }],
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },

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

  megaGlowWrap: {
    borderWidth: 2,
    borderColor: "#E6C200",
    shadowColor: "#E6C200",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  megaBoostBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#E6C200",
  },

  megaBoostBadgeHero: {
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: "#E6C200",
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },

  megaBoostText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFD700",
    letterSpacing: 0.3,
  },

  megaBoostTextHero: {
    fontSize: 12,
    letterSpacing: 0.5,
  },

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
    fontSize: 9,
    fontWeight: "800",
    color: "#EB5757",
    letterSpacing: 0.2,
  },

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

  meta: {
    padding: 8,
    gap: 4,
  },

  metaHero: {
    padding: 12,
    gap: 6,
  },

  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
  },

  titleHero: {
    fontSize: 16,
    fontWeight: "800",
  },

  price: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F1E17",
  },

  priceHero: {
    fontSize: 18,
    fontWeight: "900",
  },
})