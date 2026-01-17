import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, TextInput, View } from "react-native"

type Props = {
  value: string
  onChange: (text: string) => void
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search listings",
}: Props) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={18} color="#6B8F7D" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6B8F7D"
        style={styles.searchInput}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  searchBox: {
    marginTop: 8,
    backgroundColor: "#ffffff", // 🔥 sage green background
    borderRadius: 16,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchInput: {
    marginLeft: 8,
    color: "#0F1E17", // 🔥 dark green text
    flex: 1,
  },
})
