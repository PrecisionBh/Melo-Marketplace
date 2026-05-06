import { Ionicons } from "@expo/vector-icons"
import { ResizeMode, Video } from "expo-av"
import { useEffect, useRef, useState } from "react"
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native"

const SCREEN_WIDTH = Dimensions.get("window").width

export default function ListingImageGallery({
  images,
  videoUrl,
}: {
  images: string[]
  videoUrl?: string | null
}) {
  const [fullscreenIndex, setFullscreenIndex] =
    useState<number | null>(null)

  const [activeIndex, setActiveIndex] =
    useState(0)

    const [closingModal, setClosingModal] =
  useState(false)

  const fullscreenScrollRef =
    useRef<ScrollView>(null)

  // 🔥 DEBUG INITIAL INPUT
  useEffect(() => {
    console.log("🧪 IMAGES PROP:", images)
    console.log("🧪 VIDEO URL:", videoUrl)
  }, [images, videoUrl])

  // 🔥 Combine media
  const media = [
    ...(videoUrl ? [{ type: "video", uri: videoUrl }] : []),
    ...images.map((uri) => ({ type: "image", uri })),
  ]

  // 🔥 DEBUG MEDIA
  useEffect(() => {
    console.log("🧪 MEDIA ARRAY:", media)
  }, [media])

  useEffect(() => {
    if (
      fullscreenIndex !== null &&
      fullscreenScrollRef.current
    ) {
      setTimeout(() => {
        fullscreenScrollRef.current?.scrollTo({
          x: fullscreenIndex * SCREEN_WIDTH,
          animated: false,
        })
      }, 0)
    }
  }, [fullscreenIndex])

  if (!media.length) {
    console.log("🚨 NO MEDIA TO RENDER")
    return (
      <View style={styles.emptyWrap}>
        <Ionicons
          name="image-outline"
          size={36}
          color="#999"
        />
      </View>
    )
  }

  return (
    <>
      <View style={styles.wrap}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x /
                (SCREEN_WIDTH - 32)
            )
            setActiveIndex(index)
          }}
        >
          {media.map((item, i) => {
            console.log("🧪 RENDER ITEM:", item)

            return (
              <View key={i} style={styles.imagePage}>
                {item.type === "image" ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
  if (closingModal) return
  setFullscreenIndex(i)
}}
                    style={{ flex: 1 }}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.image}
                      resizeMode="cover"
                      onLoad={() =>
                        console.log(
                          "✅ IMAGE LOADED:",
                          item.uri
                        )
                      }
                      onError={(e) =>
                        console.log(
                          "❌ IMAGE ERROR:",
                          item.uri,
                          e.nativeEvent
                        )
                      }
                    />
                  </TouchableOpacity>
                ) : (
                  <Video
                    source={{ uri: item.uri }}
                    style={styles.image}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping
                    isMuted
                    useNativeControls={false}
                    onError={(e) =>
                      console.log(
                        "❌ VIDEO ERROR:",
                        item.uri,
                        e
                      )
                    }
                  />
                )}
              </View>
            )
          })}
        </ScrollView>

        {media.length > 1 && (
          <View style={styles.dotsWrap}>
            {media.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  activeIndex === i &&
                    styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <Modal
  visible={fullscreenIndex !== null}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => {
    setClosingModal(true)
    setFullscreenIndex(null)

    setTimeout(() => {
      setClosingModal(false)
    }, 500)
  }}
>
  <View style={styles.modal}>
    <TouchableOpacity
      style={styles.closeBtn}
      hitSlop={{
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      }}
      onPress={() => {
        setClosingModal(true)
        setFullscreenIndex(null)

        setTimeout(() => {
          setClosingModal(false)
        }, 500)
      }}
    >
      <Ionicons
        name="close"
        size={34}
        color="#fff"
      />
    </TouchableOpacity>

    <ScrollView
      ref={fullscreenScrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(e) => {
        const index = Math.round(
          e.nativeEvent.contentOffset.x /
            SCREEN_WIDTH
        )
        setFullscreenIndex(index)
      }}
    >
      {media.map((item, i) => (
        <View
          key={i}
          style={styles.fullscreenPage}
        >
          {item.type === "image" ? (
            <Image
              source={{ uri: item.uri }}
              style={styles.fullImage}
              resizeMode="contain"
              onLoad={() =>
                console.log(
                  "✅ FULL IMAGE LOADED:",
                  item.uri
                )
              }
              onError={(e) =>
                console.log(
                  "❌ FULL IMAGE ERROR:",
                  item.uri,
                  e.nativeEvent
                )
              }
            />
          ) : (
            <Video
              source={{ uri: item.uri }}
              style={styles.fullImage}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              isMuted
              useNativeControls
              onError={(e) =>
                console.log(
                  "❌ FULL VIDEO ERROR:",
                  item.uri,
                  e
                )
              }
            />
          )}
        </View>
      ))}
    </ScrollView>
  </View>
</Modal>
    </>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  imagePage: {
    width: SCREEN_WIDTH - 32,
    aspectRatio: 1,
    backgroundColor: "#000",
    borderRadius: 26,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  emptyWrap: {
    marginHorizontal: 16,
    height: 300,
    borderRadius: 26,
    backgroundColor: "#F4F1EE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  dotsWrap: {
    position: "absolute",
    bottom: 14,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  activeDot: {
    width: 22,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },

  closeBtn: {
  position: "absolute",
  top: 60,
  right: 20,
  zIndex: 999,
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
},

  fullscreenPage: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  fullImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
})