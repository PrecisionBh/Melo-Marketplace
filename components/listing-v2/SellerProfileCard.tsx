import { Ionicons } from "@expo/vector-icons"
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function SellerProfileCard({
  sellerName,
  sellerAvatar,
  sellerRatingAvg,
  sellerRatingCount,
  onViewProfile,
}: {
  sellerName: string | null
  sellerAvatar: string | null
  sellerRatingAvg: number | null
  sellerRatingCount: number
  onViewProfile: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onViewProfile}
      activeOpacity={0.85}
    >
      {sellerAvatar?.trim() ? (
        <Image
          source={{ uri: sellerAvatar }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>
            {(sellerName?.[0] ?? "S").toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {sellerName ?? "Seller"}
          </Text>
        </View>

        {sellerRatingAvg ? (
          <View style={styles.ratingRow}>
            <Ionicons
              name="star"
              size={12}
              color="#F59E0B"
            />

            <Text style={styles.ratingText}>
              {sellerRatingAvg.toFixed(1)} (
              {sellerRatingCount})
            </Text>
          </View>
        ) : (
          <Text style={styles.subText}>
            No reviews yet
          </Text>
        )}

        <Text style={styles.viewProfile}>
          View profile →
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: "#F7F4F1",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
    backgroundColor: "#EEE",
  },

  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F3E8DE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#D97732",
  },

  info: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },

  ratingText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  subText: {
    fontSize: 12,
    color: "#777",
    marginBottom: 3,
  },

  viewProfile: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
})