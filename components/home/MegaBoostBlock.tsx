import { useRouter } from "expo-router"
import { StyleSheet, View } from "react-native"
import { Video, ResizeMode } from "expo-av"

import ListingCard, { Listing } from "./ListingCard"

type Props = {
  listings: Listing[]
}

export default function MegaBoostBlock({ listings }: Props) {
  const router = useRouter()

  // Safety guard
  if (!Array.isArray(listings) || listings.length === 0) {
    return null
  }

  const megaListing = listings[0]

  const hasVideo =
    typeof megaListing.video_url === "string" &&
    megaListing.video_url.length > 0

  return (
    <View style={styles.container}>
      <View style={styles.heroCardWrap}>
        <View style={styles.mediaWrapper}>
          
          {/* 🔥 VIDEO BACKGROUND (only if exists) */}
          {hasVideo && (
            <Video
              source={{ uri: megaListing.video_url! }}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              isMuted
              isLooping
              shouldPlay
            />
          )}

          {/* 👇 YOUR ORIGINAL CARD (UNCHANGED) */}
          <View style={styles.overlay}>
            <ListingCard
              listing={megaListing}
              isMegaBoost={true}
              megaHero={true}
              onPress={() =>
                router.push(`/listing/${megaListing.id}`)
              }
            />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 3,
    marginVertical: 10,
  },

  heroCardWrap: {
    width: "100%",
    minHeight: 360,
    transform: [{ scale: 1.02 }],
  },

  /* 🔥 NEW WRAPPER (does NOT affect image logic) */
  mediaWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },

  /* 🔥 VIDEO BACKGROUND */
  video: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  /* 👇 CARD SITS ON TOP */
  overlay: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
})