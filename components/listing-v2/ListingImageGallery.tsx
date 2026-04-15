import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import { useState } from "react"
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native"

const SCREEN_WIDTH = Dimensions.get("window").width

export default function ListingImageGallery({
  images,
}: {
  images: string[]
}) {
  const [fullscreenImage, setFullscreenImage] =
    useState<string | null>(null)

  const [activeIndex, setActiveIndex] =
    useState(0)

  if (!images?.length) {
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
          {images.map((uri, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.9}
              onPress={() =>
                setFullscreenImage(uri)
              }
              style={styles.imagePage}
            >
              <Image
                source={uri}
                style={styles.image}
                contentFit="contain"
                transition={100}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.dotsWrap}>
            {images.map((_, i) => (
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
        visible={!!fullscreenImage}
        transparent
        animationType="fade"
      >
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() =>
              setFullscreenImage(null)
            }
          >
            <Ionicons
              name="close"
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={
              styles.zoomWrap
            }
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
          >
            {fullscreenImage && (
              <Image
                source={fullscreenImage}
                style={styles.fullImage}
                contentFit="contain"
              />
            )}
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
    height: 300,
    backgroundColor: "#F4F1EE",
    borderRadius: 26,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  activeDot: {
    width: 22,
    borderRadius: 8,
    backgroundColor: "#111",
  },

  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },

  closeBtn: {
    position: "absolute",
    top: 55,
    right: 20,
    zIndex: 10,
  },

  zoomWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  fullImage: {
    width: "100%",
    height: "100%",
  },
})