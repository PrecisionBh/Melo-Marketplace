import { ResizeMode, Video } from "expo-av"
import { useRouter } from "expo-router"
import { StyleSheet, View } from "react-native"

import ListingCard, { Listing } from "./ListingCard"

type Props = {
  listings: Listing[]
}

export default function MegaBoostBlock({ listings }: Props) {
  const router = useRouter()

  if (!Array.isArray(listings) || listings.length === 0) {
    return null
  }

  const megaListing = listings[0]

  const hasVideo =
    typeof megaListing.video_url === "string" &&
    megaListing.video_url.length > 0

  return (
    <View style={styles.container}>
      {/* 🔥 OUTER WRAPPER (GLOW LIVES HERE) */}
      <View style={styles.glowWrap}>
        <View style={styles.heroCardWrap}>
          
          {/* 🔥 INNER WRAPPER (CLIPPING HERE ONLY) */}
          <View style={styles.mediaWrapper}>
            
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 3,
    marginVertical: 10,
  },

  /* 🔥 GLOW WRAPPER (NO CLIPPING HERE) */
  glowWrap: {
    borderRadius: 30,
    shadowColor: "#D97732", // Melo orange
    shadowOpacity: 0.95,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 20 },

    // Android glow
    elevation: 20,
    backgroundColor: "transparent",
  },

  heroCardWrap: {
    width: "100%",
    minHeight: 360,
    transform: [{ scale: 1.02 }],
  },

  /* 🔥 CLIPPING MOVED HERE */
  mediaWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    overflow: "hidden", // ✅ ONLY HERE NOW
    position: "relative",
  },

  video: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  overlay: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
})