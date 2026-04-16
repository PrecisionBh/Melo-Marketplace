import {
    StyleSheet,
    Text,
    View,
} from "react-native"

export default function OfferStatusBadge({
  offer,
  isExpired,
}: {
  offer: any
  isExpired: boolean
}) {
  const isSold =
    !!offer?.listings?.is_sold &&
    offer.status !== "accepted"

  const getConfig = () => {
    if (isSold) {
      return {
        text: "Item Sold",
        color: "#C0392B",
      }
    }

    if (isExpired) {
      return {
        text: "Expired",
        color: "#C0392B",
      }
    }

    if (offer.status === "accepted") {
      return {
        text: "Accepted • Waiting on Payment",
        color: "#1F7A63",
      }
    }

    if (offer.status === "declined") {
      return {
        text: "Declined",
        color: "#EB5757",
      }
    }

    if (offer.status === "cancelled") {
      return {
        text: "Cancelled",
        color: "#EB5757",
      }
    }

    if (offer.status === "countered") {
      if (offer.last_actor === "buyer") {
        return {
          text: "Buyer Countered",
          color: "#E67E22",
        }
      }

      return {
        text: "Seller Countered",
        color: "#2980B9",
      }
    }

    return {
      text: "Pending Offer",
      color: "#6B7280",
    }
  }

  const cfg = getConfig()

  return (
    <View
      style={[
        styles.badge,
        { borderColor: cfg.color },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: cfg.color },
        ]}
      >
        {cfg.text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    marginBottom: 14,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
})