import { StyleSheet, Text, View } from "react-native"

type Props = {
  visible: boolean
}

export default function ReturnWarning({ visible }: Props) {
  if (!visible) return null

  return (
    <View style={styles.box}>
      <Text style={styles.title}>
        ⚠ Return Tracking Required
      </Text>

      <Text style={styles.text}>
        Please upload return tracking within 72 hours. If tracking is not uploaded,
        escrow may be released to the seller to prevent return abuse.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF4E5",
    borderWidth: 1,
    borderColor: "#F2994A",
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#C05600",
    marginBottom: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8A4B00",
    lineHeight: 18,
  },
})