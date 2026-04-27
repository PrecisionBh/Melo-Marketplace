import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

type Props = {
  // 🔥 FIXED TYPES (match your app)
  shippingType: "seller_pays" | "buyer_pays"
  setShippingType: (val: "seller_pays" | "buyer_pays") => void

  weight: string
  setWeight: (val: string) => void
  zipCode: string
  setZipCode: (val: string) => void
  length: string
  setLength: (val: string) => void
  width: string
  setWidth: (val: string) => void
  height: string
  setHeight: (val: string) => void
}

export default function CreateListingShipping({
  shippingType,
  setShippingType,
  weight,
  setWeight,
  zipCode,
  setZipCode,
  length,
  setLength,
  width,
  setWidth,
  height,
  setHeight,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>Shipping</Text>

      <View style={styles.shippingRow}>
        <TouchableOpacity
          style={[
            styles.option,
            shippingType === "seller_pays" && styles.activeOption,
          ]}
          onPress={() => setShippingType("seller_pays")}
        >
          <Text style={styles.optionTitle}>🚚 Free Shipping</Text>
          <Text style={styles.optionSub}>You cover shipping</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            shippingType === "buyer_pays" && styles.activeOption,
          ]}
          onPress={() => setShippingType("buyer_pays")}
        >
          <Text style={styles.optionTitle}>📦 Buyer Pays</Text>
          <Text style={styles.optionSub}>Calculated at checkout</Text>
        </TouchableOpacity>
      </View>

      {shippingType === "buyer_pays" && (
  <View style={styles.packageCard}>
    <Text style={styles.packageHeader}>Package Details</Text>

    <TextInput
      value={weight}
      onChangeText={setWeight}
      placeholder="Package Weight (lbs)"
      placeholderTextColor="#1b1b1b"
      style={styles.input}
      keyboardType="decimal-pad"
    />

    <TextInput
      value={zipCode}
      onChangeText={setZipCode}
      placeholder="Shipping ZIP Code"
      placeholderTextColor="#1b1b1b"
      style={styles.input}
      keyboardType="number-pad"
    />

    <View style={styles.dimensionRow}>
      <TextInput
        value={length}
        onChangeText={setLength}
        placeholder="Length"
        placeholderTextColor="#1b1b1b"
        style={[styles.input, styles.dimension]}
        keyboardType="decimal-pad"
      />

      <TextInput
        value={width}
        onChangeText={setWidth}
        placeholder="Width"
        placeholderTextColor="#1b1b1b"
        style={[styles.input, styles.dimension]}
        keyboardType="decimal-pad"
      />

      <TextInput
        value={height}
        onChangeText={setHeight}
        placeholder="Height"
        placeholderTextColor="#1b1b1b"
        style={[styles.input, styles.dimension]}
        keyboardType="decimal-pad"
      />
    </View>
  </View>
)}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
  },

  header: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },

  shippingRow: {
    flexDirection: "row",
    gap: 12,
  },

  option: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
  },

  activeOption: {
    borderColor: "#D97732",
    backgroundColor: "#FFF7F1",
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  optionSub: {
    fontSize: 13,
    color: "#000000",
    marginTop: 4,
  },

  packageCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
  },

  packageHeader: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
    color: "#111",
  },

  input: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },

  dimensionRow: {
    flexDirection: "row",
    gap: 10,
  },

  dimension: {
    flex: 1,
    marginBottom: 0,
  },
})