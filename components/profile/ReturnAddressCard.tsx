import ReturnAddressForm from "@/components/return-address/ReturnAddressForm"
import { StyleSheet, Text, View } from "react-native"

export default function ReturnAddressCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Return Address</Text>
      <ReturnAddressForm />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 12,
  },
})