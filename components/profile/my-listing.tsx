import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  listing: {
    id: string
    title: string
    price: number
    image_urls?: string[] | null
    status?: "active" | "inactive"
    views?: number
    favorites_count?: number
    created_at?: string
    is_boosted?: boolean
  }
}

export default function MyListingCard({
  listing,
}: Props) {
  const router = useRouter()

  const image =
    listing.image_urls?.[0] ?? null

  const formattedDate = listing.created_at
    ? new Date(
        listing.created_at
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown"

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() =>
        router.push(`/listing/${listing.id}`)
      }
    >
      {/* 🔥 IMAGE */}
      <View style={styles.imageWrap}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name="image-outline"
              size={26}
              color="#9CA3AF"
            />
          </View>
        )}
      </View>

      {/* 🔥 RIGHT SIDE */}
      <View style={styles.rightSide}>
        {/* TOP ROW */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={styles.title}
            >
              {listing.title}
            </Text>

            <Text style={styles.price}>
              $
              {Number(
                listing.price ?? 0
              ).toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              listing.status === "active"
                ? styles.activeBadge
                : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                listing.status === "active"
                  ? styles.activeText
                  : styles.inactiveText,
              ]}
            >
              {listing.status === "active"
                ? "Active"
                : "Inactive"}
            </Text>
          </View>
        </View>

        <View style={styles.analyticsRow}>
  <View style={styles.analyticsItem}>
    <Ionicons
      name="eye-outline"
      size={15}
      color="#6B7280"
    />

    <Text style={styles.analyticsText}>
      {listing.views ?? 0} Views
    </Text>
  </View>

  <View style={styles.analyticsItem}>
    <Ionicons
      name="heart-outline"
      size={15}
      color="#6B7280"
    />

    <Text style={styles.analyticsText}>
      {listing.favorites_count ?? 0} Likes
    </Text>
  </View>

          {listing.is_boosted && (
            <View style={styles.boostBadge}>
              <Ionicons
                name="rocket-outline"
                size={12}
                color="#fff"
              />

              <Text style={styles.boostText}>
                Boosted
              </Text>
            </View>
          )}
        </View>

        {/* 🔥 BOTTOM ROW */}
        <View style={styles.bottomRow}>
          <Text style={styles.dateText}>
            Listed {formattedDate}
          </Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              router.push({
                pathname:
                  "/edit-listing/[id]" as any,
                params: {
                  id: listing.id,
                },
              } as any)
            }
          >
            <Ionicons
              name="create-outline"
              size={14}
              color="#111827"
            />

            <Text style={styles.editText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  imageWrap: {
    width: 105,
    height: 105,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
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

  rightSide: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  activeBadge: {
    backgroundColor: "#DCFCE7",
  },

  inactiveBadge: {
    backgroundColor: "#E5E7EB",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  activeText: {
    color: "#166534",
  },

  inactiveText: {
    color: "#4B5563",
  },

  analyticsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  analyticsItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },

  analyticsText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D97732",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  boostText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  dateText: {
    fontSize: 12,
    color: "#6B7280",
  },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  editText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
})