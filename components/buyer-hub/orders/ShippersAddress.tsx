import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

type SellerReturnAddress = {
  id: string
  user_id: string
  full_name: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default?: boolean | null
}

type Props = {
  address: SellerReturnAddress | null
}

export default function ShippersAddress({ address }: Props) {
  if (!address) return null

  return (
    <View style={styles.container}>
      {/* 📦 RETURN SHIPPING ADDRESS */}
      <View style={styles.addressCard}>
        <View style={styles.headerRow}>
          <Ionicons name="cube-outline" size={18} color="#7FAF9B" />
          <Text style={styles.title}>Return Shipping Address</Text>
        </View>

        <Text style={styles.addressText}>{address.full_name}</Text>
        <Text style={styles.addressText}>{address.address_line1}</Text>

        {!!address.address_line2 && (
          <Text style={styles.addressText}>{address.address_line2}</Text>
        )}

        <Text style={styles.addressText}>
          {address.city}, {address.state} {address.postal_code}
        </Text>

        <Text style={styles.addressText}>{address.country}</Text>
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
    borderColor: "#E0E0E0",
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