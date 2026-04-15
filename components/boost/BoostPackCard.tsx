import { Ionicons } from "@expo/vector-icons"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Pack = {
  id: string
  title: string
  subtitle: string
  badge?: string
  accent?: "boost" | "mega"
}

export default function BoostPackCard({
  pack,
  price,
  loading,
  onPress,
}: {
  pack: Pack
  price: string
  loading: boolean
  onPress: () => void
}) {
  const isMega =
    pack.accent === "mega"

  return (
    <View
      style={[
        styles.card,
        isMega
          ? styles.megaCard
          : styles.boostCard,
      ]}
    >
      {pack.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {pack.badge}
          </Text>
        </View>
      )}

      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrap,
            isMega
              ? styles.megaIconWrap
              : styles.boostIconWrap,
          ]}
        >
          <Ionicons
            name={
              isMega
                ? "rocket"
                : "flash"
            }
            size={18}
            color={
              isMega
                ? "#9333EA"
                : "#D97732"
            }
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>
            {pack.title}
          </Text>

          <Text style={styles.subtitle}>
            {pack.subtitle}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.buyBtn}
        onPress={onPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buyText}>
            {price}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderRadius: 22,
    padding: 16,
    borderWidth: 2,
    marginBottom: 14,
  },

  boostCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },

  megaCard: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },

  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  boostIconWrap: {
    backgroundColor: "#FFFFFF",
  },

  megaIconWrap: {
    backgroundColor: "#FFFFFF",
  },

  info: {
    flex: 1,
    paddingRight: 55,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 17,
  },

  buyBtn: {
    backgroundColor: "#D97732",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  buyText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
})