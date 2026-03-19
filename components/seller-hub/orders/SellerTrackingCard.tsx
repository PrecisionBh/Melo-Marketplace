import { StyleSheet, Text, View } from "react-native"

type Props = {
  tracking_status?: string | null
}

export default function SellerTrackingCard({
  tracking_status,
}: Props) {
  const getMessage = () => {
    switch (tracking_status) {
      case "label_created":
        return {
          title: "Label Created",
          message:
            "Shipping label created. Please drop off your package at the carrier.",
        }

      case "in_transit":
        return {
          title: "In Transit",
          message:
            "Your package is on the way to the buyer.",
        }

      case "out_for_delivery":
        return {
          title: "Out for Delivery",
          message:
            "The package is out for delivery and should arrive today.",
        }

      case "delivered":
        return {
          title: "Delivered",
          message:
            "The package has been delivered. Funds will be released to your account automatically after 2 days unless an issue is reported.",
        }

      default:
        return null
    }
  }

  const data = getMessage()

  if (!data) return null

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.message}>{data.message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },

  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 4,
  },

  message: {
    fontSize: 13,
    color: "#4B6A5D",
    fontWeight: "600",
    lineHeight: 18,
  },
})