import {
    Image,
    StyleSheet,
    Text,
    View,
} from "react-native"

import OfferStatusBadge from "./OfferStatusBadge"

export default function OfferSummaryCard({
  offer,
  isExpired,
}: {
  offer: any
  isExpired: boolean
}) {
  const image =
    offer.accepted_image_url ||
    offer.listings?.image_urls?.[0] ||
    "https://via.placeholder.com/300"

  const title =
    offer.accepted_title ||
    offer.listings?.title ||
    "Offer"

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: image }}
        style={styles.image}
      />

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.subText}>
        Offer ID: {offer.id}
      </Text>

      <OfferStatusBadge
        offer={offer}
        isExpired={isExpired}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 16,
  },

  image: {
    width: "100%",
    height: 240,
    borderRadius: 18,
    marginBottom: 14,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 6,
  },

  subText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 10,
  },
})