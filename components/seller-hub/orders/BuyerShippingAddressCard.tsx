import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

type BuyerShippingAddress = {
  shipping_name: string | null
  shipping_line1: string | null
  shipping_line2?: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_postal_code: string | null
  shipping_country: string | null
}

type Props = {
  address: BuyerShippingAddress | null
}

export default function BuyerShippingAddressCard({ address }: Props) {
  if (!address || !address.shipping_name) return null

  return (
    <View style={styles.container}>
      {/* 📦 BUYER SHIPPING ADDRESS (SELLER VIEW) */}
      <View style={styles.addressCard}>
        <View style={styles.headerRow}>
          <Ionicons name="location-outline" size={18} color="#7FAF9B" />
          <Text style={styles.title}>Ship To (Buyer Address)</Text>
        </View>

        <Text style={styles.addressText}>{address.shipping_name}</Text>
        <Text style={styles.addressText}>{address.shipping_line1}</Text>

        {!!address.shipping_line2 && (
          <Text style={styles.addressText}>{address.shipping_line2}</Text>
        )}

        <Text style={styles.addressText}>
          {address.shipping_city}, {address.shipping_state}{" "}
          {address.shipping_postal_code}
        </Text>

        <Text style={styles.addressText}>{address.shipping_country}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2EFE8", // Melo soft border (match other cards)
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17", // Melo dark green
  },
  addressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F1E17",
    lineHeight: 20,
  },
})