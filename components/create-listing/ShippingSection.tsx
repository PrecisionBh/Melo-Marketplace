import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"

type Props = {
  shippingType: "seller_pays" | "buyer_pays" | null
  setShippingType: (v: "seller_pays" | "buyer_pays") => void
  shippingPrice: string
  setShippingPrice: (v: string) => void
}

export default function ShippingSection({
  shippingType,
  setShippingType,
  shippingPrice,
  setShippingPrice,
}: Props) {
  const isBuyerPays = shippingType === "buyer_pays"
  const isSellerPays = shippingType === "seller_pays"

  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        {/* Header */}
        <Text style={styles.title}>Shipping *</Text>
        <Text style={styles.subText}>
          Choose who pays for shipping on this item.
        </Text>

        <View style={styles.divider} />

        {/* SELLER PAYS OPTION */}
        <TouchableOpacity
          style={[
            styles.optionRow,
            isSellerPays && styles.optionRowActive,
          ]}
          onPress={() => {
            setShippingType("seller_pays")
            setShippingPrice("")
          }}
          activeOpacity={0.85}
        >
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Free Shipping</Text>
            <Text style={styles.optionHelper}>
              You cover the shipping cost (recommended for better sales)
            </Text>
          </View>

          <View
            style={[
              styles.radio,
              isSellerPays && styles.radioActive,
            ]}
          />
        </TouchableOpacity>

        {/* BUYER PAYS OPTION */}
        <TouchableOpacity
          style={[
            styles.optionRow,
            isBuyerPays && styles.optionRowActive,
          ]}
          onPress={() => setShippingType("buyer_pays")}
          activeOpacity={0.85}
        >
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Buyer Pays Shipping</Text>
            <Text style={styles.optionHelper}>
              Set a flat shipping price for the buyer
            </Text>
          </View>

          <View
            style={[
              styles.radio,
              isBuyerPays && styles.radioActive,
            ]}
          />
        </TouchableOpacity>

        {/* SHIPPING PRICE INPUT (ONLY IF BUYER PAYS) */}
        {isBuyerPays && (
          <View style={styles.priceWrap}>
            <Text style={styles.priceLabel}>Shipping Price *</Text>

            <TextInput
              style={styles.priceInput}
              value={shippingPrice}
              onChangeText={setShippingPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#A0A0A0"
            />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* FULL BLEED SECTION (NO EDGES - matches your builder) */
  section: {
    marginHorizontal: -16,
    backgroundColor: "#FFFFFF",
  },

  inner: {
    paddingTop: 18,
    paddingBottom: 8,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    paddingHorizontal: 16,
    marginBottom: 2,
  },

  subText: {
    fontSize: 12,
    color: "#323232", // your preferred subtext color
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
    width: "100%",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    backgroundColor: "#FFFFFF",
  },

  optionRowActive: {
    backgroundColor: "#F4FAF7", // subtle Melo highlight
  },

  optionTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1E17",
    marginBottom: 2,
  },

  optionHelper: {
    fontSize: 12,
    color: "#6B6B6B",
  },

  /* Radio Circle (premium marketplace feel) */
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#DADADA",
  },

  radioActive: {
    borderColor: "#7FAF9B",
    backgroundColor: "#7FAF9B",
  },

  priceWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },

  priceLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1E17",
    marginBottom: 6,
  },

  priceInput: {
    height: 46,
    borderWidth: 1,
    borderColor: "#DADADA",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F1E17",
  },
})