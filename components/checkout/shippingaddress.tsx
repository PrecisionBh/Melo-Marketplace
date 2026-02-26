import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Switch, Text, TextInput, View } from "react-native"

type Props = {
  useSaved: boolean
  setUseSaved: (v: boolean) => void
  saveAsDefault: boolean
  setSaveAsDefault: (v: boolean) => void

  name: string
  setName: (v: string) => void
  line1: string
  setLine1: (v: string) => void
  line2: string
  setLine2: (v: string) => void
  city: string
  setCity: (v: string) => void
  state: string
  setState: (v: string) => void
  postal: string
  setPostal: (v: string) => void
  phone: string
  setPhone: (v: string) => void

  hasSavedAddress?: boolean
}

export default function ShippingAddress({
  useSaved,
  setUseSaved,
  saveAsDefault,
  setSaveAsDefault,
  name,
  setName,
  line1,
  setLine1,
  line2,
  setLine2,
  city,
  setCity,
  state,
  setState,
  postal,
  setPostal,
  phone,
  setPhone,
  hasSavedAddress = false,
}: Props) {
  const isAddressIncomplete =
    !name?.trim() ||
    !line1?.trim() ||
    !city?.trim() ||
    !state?.trim() ||
    !postal?.trim()

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Ionicons name="location-outline" size={20} color="#000" />
        <Text style={styles.title}>Shipping Address</Text>
      </View>

      {/* SAVED ADDRESS TOGGLE */}
      {hasSavedAddress && (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Use saved address</Text>
          <Switch
            value={useSaved}
            onValueChange={setUseSaved}
            trackColor={{ false: "#ccc", true: "#7FAF9B" }}
            thumbColor="#fff"
          />
        </View>
      )}

      {/* ADDRESS FORM (ALWAYS VISIBLE — PREFILL OR CLEAR CONTROLLED BY PARENT) */}
      <>
        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Address Line 1 *"
          value={line1}
          onChangeText={setLine1}
        />

        <TextInput
          style={styles.input}
          placeholder="Address Line 2 (Optional)"
          value={line2}
          onChangeText={setLine2}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="City *"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="State *"
            value={state}
            onChangeText={setState}
            autoCapitalize="characters"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="ZIP Code *"
          value={postal}
          onChangeText={setPostal}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone (Recommended)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {/* SAVE DEFAULT TOGGLE */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            Save as default shipping address
          </Text>
          <Switch
            value={saveAsDefault}
            onValueChange={setSaveAsDefault}
            trackColor={{ false: "#ccc", true: "#7FAF9B" }}
            thumbColor="#fff"
          />
        </View>
      </>

      {/* VALIDATION WARNING (ALWAYS CHECK FORM, NOT TOGGLE STATE) */}
      {isAddressIncomplete && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#8A5A00" />
          <Text style={styles.warningText}>
            Please complete all required shipping fields before payment.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },
  input: {
    backgroundColor: "#F6F7F6",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  half: {
    flex: 1,
  },
  toggleRow: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    maxWidth: "75%",
  },
  warningBox: {
    marginTop: 10,
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  warningText: {
    fontSize: 12,
    color: "#8A5A00",
    fontWeight: "600",
    flex: 1,
  },
})