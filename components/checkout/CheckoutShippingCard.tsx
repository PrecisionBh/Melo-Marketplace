import { Ionicons } from "@expo/vector-icons"
import {
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  expanded: boolean
  setExpanded: (v: boolean) => void

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

  saveAsDefault: boolean
  setSaveAsDefault: (v: boolean) => void
}

export default function CheckoutShippingCard({
  expanded,
  setExpanded,

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

  saveAsDefault,
  setSaveAsDefault,
}: Props) {
  const addressValid =
    name &&
    line1 &&
    city &&
    state &&
    postal

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() =>
          setExpanded(!expanded)
        }
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="location-outline"
            size={18}
            color="#D97732"
          />

          <Text style={styles.headerText}>
            Shipping Address
          </Text>

          {!expanded &&
            addressValid && (
              <Text
                style={
                  styles.previewText
                }
                numberOfLines={1}
              >
                {line1}, {city}
              </Text>
            )}
        </View>

        <Ionicons
          name={
            expanded
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.formWrap}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Address Line 1"
            value={line1}
            onChangeText={setLine1}
          />

          <Input
            label="Address Line 2"
            value={line2}
            onChangeText={setLine2}
            optional
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="City"
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View
              style={{
                width: 80,
              }}
            >
              <Input
                label="State"
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Input
                label="ZIP"
                value={postal}
                onChangeText={setPostal}
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                optional
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              Save as default shipping
              address
            </Text>

            <Switch
              value={saveAsDefault}
              onValueChange={
                setSaveAsDefault
              }
              trackColor={{
                true: "#D97732",
              }}
            />
          </View>
        </View>
      )}
    </View>
  )
}

function Input({
  label,
  optional = false,
  ...props
}: any) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>
        {label}
        {optional && (
          <Text
            style={
              styles.optional
            }
          >
            {" "}
            (Optional)
          </Text>
        )}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={label}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
    marginBottom: 20,
  },

  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  headerText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginLeft: 8,
  },

  previewText: {
    marginLeft: 10,
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },

  formWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },

  inputWrap: {
    marginTop: 14,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },

  optional: {
    color: "#9CA3AF",
    fontWeight: "500",
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: "#111",
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  toggleRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
    paddingRight: 12,
  },
})