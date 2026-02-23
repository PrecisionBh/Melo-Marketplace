import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function ProQuickActions() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pro Tools</Text>

      {/* View Public Profile */}
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => router.push("/profile")}
      >
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={18} color="#0F1E17" />
          </View>
          <Text style={styles.label}>View Public Profile</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#0F1E17" />
      </TouchableOpacity>

      {/* Manage Listings */}
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => router.push("/seller-hub/my-listings")}
      >
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="pricetag-outline" size={18} color="#0F1E17" />
          </View>
          <Text style={styles.label}>Manage Listings</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#0F1E17" />
      </TouchableOpacity>

      {/* Payout History (Pro Only Area) */}
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => router.push("/seller-hub/payout-history")}
      >
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={18} color="#0F1E17" />
          </View>
          <Text style={styles.label}>Payout History</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#0F1E17" />
      </TouchableOpacity>

      {/* Manage Subscription (Stripe Portal Later) */}
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => {
          console.log("💳 Open Stripe Customer Portal (Future)")
        }}
      >
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="card-outline" size={18} color="#0F1E17" />
          </View>
          <Text style={styles.label}>Manage Subscription</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#0F1E17" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E6EFEA", // soft premium border (NO heavy shadow)
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F1E17",
  },
})