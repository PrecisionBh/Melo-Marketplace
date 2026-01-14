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
      <Ionicons name="search" size={18} color="#9FB8AC" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9FB8AC"
        style={styles.searchInput}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  searchBox: {
    marginTop: 8,
    backgroundColor: "#24352D",
    borderRadius: 16,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchInput: {
    marginLeft: 8,
    color: "#E8F5EE",
    flex: 1,
  },
})
