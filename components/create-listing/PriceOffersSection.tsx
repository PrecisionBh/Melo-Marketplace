import { StyleSheet, Switch, Text, TextInput, View } from "react-native"

type Props = {
  price: string
  setPrice: (v: string) => void
  allowOffers: boolean
  setAllowOffers: (v: boolean) => void
  minOffer: string
  setMinOffer: (v: string) => void
}

export default function PriceOffersSection({
  price,
  setPrice,
  allowOffers,
  setAllowOffers,
  minOffer,
  setMinOffer,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        {/* HEADER */}
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Price & Offers</Text>
          <Text style={styles.subText}>
            Set your listing price and optionally accept buyer offers.
          </Text>
        </View>

        <View style={styles.divider} />

        {/* PRICE FIELD */}
        <View style={styles.field}>
          <View style={styles.fieldTextWrap}>
            <Text style={styles.label}>Price *</Text>
            <Text style={styles.helper}>
              The main price buyers will see on your listing.
            </Text>
          </View>

          {/* 💲 INPUT WITH DOLLAR PREFIX */}
          <View style={styles.priceInputWrap}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#A0A0A0"
            />
          </View>
        </View>

        {/* ACCEPT OFFERS TOGGLE */}
        <View style={styles.field}>
          <View style={styles.fieldTextWrap}>
            <Text style={styles.label}>Accept Offers</Text>
            <Text style={styles.helper}>
              Allow buyers to submit offers below your listed price.
            </Text>
          </View>

          <Switch
            value={allowOffers}
            onValueChange={setAllowOffers}
            trackColor={{ false: "#DADADA", true: "#7FAF9B" }}
            thumbColor={allowOffers ? "#0F1E17" : "#FFFFFF"}
          />
        </View>

        {/* CONDITIONAL MIN OFFER */}
        {allowOffers && (
          <View style={styles.field}>
            <View style={styles.fieldTextWrap}>
              <Text style={styles.label}>Minimum Offer *</Text>
              <Text style={styles.helper}>
                Required when offers are enabled. Must be below your price.
              </Text>
            </View>

            {/* 💲 MIN OFFER WITH DOLLAR PREFIX */}
            <View style={styles.priceInputWrap}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={minOffer}
                onChangeText={setMinOffer}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* FULL BLEED - NO EDGES (matches your builder system) */
  section: {
    marginHorizontal: -16,
    backgroundColor: "#FFFFFF",
  },

  inner: {
    paddingTop: 18,
    paddingBottom: 12,
  },

  headerWrap: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    marginBottom: 4,
  },

  /* Your requested subtext color */
  subText: {
    fontSize: 12,
    color: "#323232",
  },

  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
    width: "100%",
    marginBottom: 6,
  },

  field: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  fieldTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1E17",
    marginBottom: 2,
  },

  helper: {
    fontSize: 12,
    color: "#6B6B6B",
  },

  /* 💲 Wrapper for $ + input */
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DADADA",
    backgroundColor: "#F8F8F8",
    height: 42,
    paddingHorizontal: 10,
    minWidth: 110,
  },

  dollar: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    marginRight: 4,
  },

  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1E17",
    paddingVertical: 0,
  },
})