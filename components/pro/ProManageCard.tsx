import { Ionicons } from "@expo/vector-icons"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function ProManageCard({
  onManage,
}: {
  onManage: () => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Ionicons
          name="checkmark-circle"
          size={14}
          color="#16A34A"
        />
        <Text style={styles.badgeText}>
          ACTIVE SUBSCRIPTION
        </Text>
      </View>

      <Text style={styles.title}>
        You're Melo Pro 🎉
      </Text>

      <Text style={styles.description}>
        Your Melo Pro membership is active.
        You currently receive all premium
        seller benefits.
      </Text>

      <View style={styles.activeBenefits}>
        {[
          "Reduced Seller Fees",
          "Unlimited Listings",
          "Quantity Listings",
          "Priority Support",
        ].map((benefit) => (
          <View
            key={benefit}
            style={styles.benefitRow}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color="#16A34A"
            />
            <Text
              style={styles.benefitText}
            >
              {benefit}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.manageBtn}
        onPress={onManage}
      >
        <Text style={styles.manageText}>
          Manage Subscription
        </Text>
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
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },

  badgeText: {
    color: "#16A34A",
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
    marginBottom: 20,
  },

  activeBenefits: {
    gap: 12,
    marginBottom: 24,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  benefitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },

  manageBtn: {
    backgroundColor: "#111827",
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  manageText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
})