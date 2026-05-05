import {
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native"

type Props = {
  value: string
  onChange: (text: string) => void
  label?: string
  placeholder?: string
  helperText?: string
}

export default function SKUInput({
  value,
  onChange,
  label = "SKU (Optional)",
  placeholder = "e.g. A1, BIN-3, SHELF-2",
  helperText = "Use this to track inventory location or internal ID",
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        autoCapitalize="characters"
      />

      {helperText ? (
        <Text style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
  marginTop: 14,   // 🔥 ADD THIS
  marginBottom: 14,
},

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  helper: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 6,
  },
})