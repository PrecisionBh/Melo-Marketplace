import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { handleAppError } from "@/lib/errors/appError"

type Props = {
  images: string[]
  setImages: (images: string[] | ((prev: string[]) => string[])) => void
  max?: number
}

export default function ImageUpload({
  images,
  setImages,
  max = 7,
}: Props) {
  const pickImage = async () => {
    try {
      if (images.length >= max) {
        Alert.alert("Limit reached", `You can upload up to ${max} photos.`)
        return
      }

      const remainingSlots = max - images.length

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], // no deprecation warning
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      })

      if (!result.canceled && result.assets?.length > 0) {
        const newUris = result.assets.map((asset) => asset.uri)

        setImages((prev) => {
          const combined = [...prev, ...newUris]
          return combined.slice(0, max)
        })
      }
    } catch (err) {
      handleAppError(err, {
        context: "image_upload_picker",
        fallbackMessage: "Failed to select images. Please try again.",
      })
    }
  }

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img !== uri))
  }

  const remainingSlots = Math.max(max - images.length, 0)

  return (
    <View style={styles.fullBleedSection}>
      <View style={styles.inner}>
        {/* Title + Subtext INSIDE same box */}
        <Text style={styles.title}>Photos *</Text>
        <Text style={styles.subText}>
          Add up to {max} photos. First photo will be the cover.
        </Text>

        {/* Full-width divider */}
        <View style={styles.divider} />

        {/* Horizontal image row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.squareWrapper}>
              <Image source={{ uri }} style={styles.squareImage} />

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => removeImage(uri)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {Array.from({ length: remainingSlots }).map((_, i) => {
            const isFirstSlot = images.length === 0 && i === 0

            return (
              <TouchableOpacity
                key={`empty-${i}`}
                style={styles.addSquare}
                onPress={pickImage}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isFirstSlot ? "camera-outline" : "add"}
                  size={30}
                  color="#7FAF9B"
                />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* 🚀 TRUE EDGE-TO-EDGE BLEED */
  fullBleedSection: {
    marginHorizontal: -16, // 🔥 THIS removes left/right edges from parent padding
    backgroundColor: "#EEF6F2",
  },

  inner: {
    paddingTop: 16,
    paddingBottom: 18,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    paddingHorizontal: 16,
    marginBottom: 2,
  },

  subText: {
    fontSize: 12,
    color: "#323232",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#DCEAE4",
    width: "100%",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },

  /* Bigger + more visible */
  squareWrapper: {
    width: 120,
    height: 120,
    position: "relative",
  },

  squareImage: {
    width: "100%",
    height: "100%",
    borderRadius: 0, // sharp corners
  },

  addSquare: {
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: "#CFE3DA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },

  deleteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#E5484D",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
})