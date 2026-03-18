import { StyleSheet, Text, View } from "react-native"

export default function ShippingCancel() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Payment Cancelled ❌</Text>
      <Text style={styles.sub}>You can try again anytime.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "600",
  },
  sub: {
    marginTop: 10,
    color: "#666",
  },
})