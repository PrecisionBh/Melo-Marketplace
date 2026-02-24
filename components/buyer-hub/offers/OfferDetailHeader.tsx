import React from "react"
import { Image, StyleSheet, Text, View } from "react-native"

/* ---------------- TYPES ---------------- */

type Props = {
  title: string
  imageUrl: string | null
  statusBadge: React.ReactNode
}

/* ---------------- COMPONENT ---------------- */

export default function OfferDetailHeader({
  title,
  imageUrl,
  statusBadge,
}: Props) {
  return (
    <View style={styles.headerWrap}>
      <Image
        source={{
          uri: imageUrl ?? "https://via.placeholder.com/300",
        }}
        style={styles.image}
      />

      <Text style={styles.title}>{title}</Text>

      {/* Status Badge injected from parent (keeps logic in screen) */}
      {statusBadge}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  headerWrap: {
    marginBottom: 4,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#EEE",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    color: "#0F1E17",
  },
})