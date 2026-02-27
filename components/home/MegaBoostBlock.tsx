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
    console.log("👑 MegaBoostBlock: No listings provided")
    return null
  }

  // 👑 TRUE TAKEOVER: only render ONE listing (no duplication)
  const megaListing = listings[0]

  console.log("👑 Rendering GIANT Mega Boost listing:", megaListing?.id)

  return (
    <View style={styles.container}>
      <View style={styles.giantCardWrap}>
        <ListingCard
          listing={megaListing}
          isMegaBoost={true} // keeps badge + glow
          onPress={() => router.push(`/listing/${megaListing.id}`)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 3, // matches ListingsGrid
    marginVertical: 6,
  },

  /**
   * 🔥 CRITICAL:
   * DO NOT use aspectRatio here or it can visually crop
   * the title/price meta section on some devices.
   *
   * Instead we use minHeight so:
   * - Card stays full width (3 columns)
   * - Title & price ALWAYS remain visible
   * - Feels like 2-row hero card
   */
  giantCardWrap: {
    width: "100%",
    minHeight: 320, // ≈ 2 grid rows tall (safe across devices)
  },
})