import { useRouter } from "expo-router"
import { StyleSheet, View } from "react-native"

import ListingCard, { Listing } from "./ListingCard"

type Props = {
  listings: Listing[] // pre-filtered mega boosted listings
}

export default function MegaBoostBlock({ listings }: Props) {
  const router = useRouter()

  // Safety guard
  if (!Array.isArray(listings) || listings.length === 0) {
    return null
  }

  // 👑 TRUE TAKEOVER: only render ONE listing (no duplication)
  const megaListing = listings[0]

  return (
    <View style={styles.container}>
      <View style={styles.heroCardWrap}>
        <ListingCard
          listing={megaListing}
          isMegaBoost={true} // keeps gold glow + badge logic
          megaHero={true} // 🔥 tells card to upscale title/price/badge
          onPress={() => router.push(`/listing/${megaListing.id}`)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 3, // matches ListingsGrid spacing
    marginVertical: 10, // slightly more separation = premium feel
  },

  /**
   * 👑 HERO CARD (Original Card, Just Bigger)
   * - Full width (all 3 columns)
   * - Taller than grid cards
   * - No aspectRatio to prevent meta cropping
   */
  heroCardWrap: {
    width: "100%",
    minHeight: 360, // Bigger than before (was 320)
    transform: [{ scale: 1.02 }], // subtle premium enlargement
  },
})