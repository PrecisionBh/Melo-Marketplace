import { Ionicons } from "@expo/vector-icons"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function ProUpgradeCard({
  price,
  loading,
  onSubscribe,
}: {
  price: string
  loading: boolean
  onSubscribe: () => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          PRO MEMBERSHIP
        </Text>
      </View>

      <Text style={styles.title}>
        Upgrade to Melo Pro
      </Text>

      <Text style={styles.description}>
        Unlock reduced fees, unlimited
        listings, quantity support, and
        premium seller perks.
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>
          {price}
        </Text>
        <Text style={styles.per}>
          /month
        </Text>
      </View>

      <View style={styles.features}>
        {[
          "1% Seller Fee",
          "Unlimited Listings",
          "Quantity Listings",
          "Melo Pro Badge",
          "Priority Support",
        ].map((feature) => (
          <View
            key={feature}
            style={styles.featureRow}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color="#22C55E"
            />
            <Text
              style={styles.featureText}
            >
              {feature}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={onSubscribe}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>
            Subscribe to Melo Pro
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 22,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },

  badgeText: {
    color: "#EA580C",
    fontSize: 11,
    fontWeight: "800",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 21,
    marginBottom: 18,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 20,
  },

  price: {
    fontSize: 34,
    fontWeight: "900",
    color: "#111",
  },

  per: {
    fontSize: 15,
    color: "#777",
    marginLeft: 4,
    marginBottom: 4,
  },

  features: {
    gap: 12,
    marginBottom: 24,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  featureText: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
  },

  primaryBtn: {
    backgroundColor: "#D97732",
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
})