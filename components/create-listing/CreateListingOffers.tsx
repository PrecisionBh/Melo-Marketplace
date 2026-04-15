import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  allowOffers: boolean
  setAllowOffers: (val: boolean) => void
  minOffer: string
  setMinOffer: (val: string) => void
}

export default function CreateListingOffers({
  allowOffers,
  setAllowOffers,
  minOffer,
  setMinOffer,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.label}>Allow Offers</Text>
          <Text style={styles.subtext}>
            Let buyers submit offers on this listing
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setAllowOffers(!allowOffers)}
          style={[
            styles.toggle,
            allowOffers && styles.toggleActive,
          ]}
        >
          <View
            style={[
              styles.knob,
              allowOffers && styles.knobActive,
            ]}
          />
        </TouchableOpacity>
      </View>

      {allowOffers && (
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Minimum Offer Amount</Text>
          <TextInput
            value={minOffer}
            onChangeText={(val) =>
              setMinOffer(val.replace(/[^0-9.]/g, ""))
            }
            placeholder="0.00"
            placeholderTextColor="#9A9A9A"
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
  },

  toggleRow: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  subtext: {
    fontSize: 12,
    color: "#777",
  },

  toggle: {
    width: 56,
    height: 32,
    borderRadius: 20,
    backgroundColor: "#DDD",
    padding: 4,
    justifyContent: "center",
  },

  toggleActive: {
    backgroundColor: "#D97732",
  },

  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },

  knobActive: {
    alignSelf: "flex-end",
  },

  fieldBlock: {
    marginTop: 14,
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111",
  },
})