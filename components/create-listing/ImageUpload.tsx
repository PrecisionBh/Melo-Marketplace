import { Ionicons } from "@expo/vector-icons"
import { ResizeMode, Video } from "expo-av"
import * as ImageManipulator from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import { useState } from "react"
import {
  Alert,
  Image,
  Modal,
  Pressable,
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

  // 🔥 ADD VIDEO (only addition)
  video: any
  setVideo: (video: any) => void

  max?: number
}

export default function ImageUpload({
  images,
  setImages,
  video,
  setVideo,
  max = 5,
}: Props) {
  const [showPicker, setShowPicker] = useState(false)

  /* ---------------- VIDEO ---------------- */

  const pickVideo = async () => {
    try {
      setShowPicker(false)

      if (video) {
        Alert.alert("Limit reached", "Only 1 video allowed.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        videoMaxDuration: 7,
        quality: 0.7,
      })

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0]

        if (asset.duration && asset.duration > 7000) {
          Alert.alert("Too long", "Video must be 7 seconds or less.")
          return
        }

        setVideo(asset)
      }
    } catch (err) {
      handleAppError(err, { context: "video_picker" })
    }
  }

  const removeVideo = () => {
    setVideo(null)
  }

  /* ---------------- LIBRARY ---------------- */

  const pickImage = async () => {
  try {
    console.log("📸 pickImage START")

    // 🔥 Permission check
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo library access in settings."
      )
      return
    }

    if (images.length >= max) {
      Alert.alert("Limit reached", `You can upload up to ${max} photos.`)
      return
    }

    const remainingSlots = max - images.length

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
    })

    console.log("📸 Picker result:", result)

    if (!result.canceled && result.assets?.length > 0) {
      const convertedUris = await Promise.all(
        result.assets.map(async (asset, index) => {
          console.log(`📸 Converting image ${index}:`, asset.uri)

          const converted = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1200 } }],
            {
              compress: 0.25,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          )

          return converted.uri
        })
      )

      setImages((prev) => {
        const combined = [...prev, ...convertedUris]
        return combined.slice(0, max)
      })
    } else {
      console.log("📸 No images selected")
    }

  } catch (err) {
    console.log("❌ PICK IMAGE ERROR:", err)
    handleAppError(err, {
      context: "image_upload_picker",
    })
  }
}

  /* ---------------- CAMERA ---------------- */

  const takePhoto = async () => {
    try {
      setShowPicker(false)

      if (images.length >= max) {
        Alert.alert("Limit reached", `You can upload up to ${max} photos.`)
        return
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync()

      if (!permission.granted) {
        Alert.alert("Permission required", "Enable camera access.")
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.35,
      })

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0]

        const converted = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          {
            compress: 0.25,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        )

        setImages((prev) => {
          const combined = [...prev, converted.uri]
          return combined.slice(0, max)
        })
      }
    } catch (err) {
      handleAppError(err, {
        context: "image_upload_camera",
      })
    }
  }

  /* ---------------- REMOVE ---------------- */

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img !== uri))
  }

  const remainingSlots = Math.max(max - images.length, 0)

  return (
    <View style={styles.fullBleedSection}>
      <View style={styles.inner}>
        <Text style={styles.title}>Photos</Text>

        {/* 🔥 DISCLAIMER */}
        <Text style={styles.disclaimer}>
          Add up to {max} photos and 1 video (max 7 seconds). Videos only appear
          on the home feed when Mega Boosted.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {video && (
  <View style={styles.squareWrapper}>
    <Video
      source={{ uri: video.uri }}
      style={styles.squareImage}
      resizeMode={ResizeMode.COVER}
      isMuted
      isLooping
      shouldPlay
    />

    <TouchableOpacity
      style={styles.deleteButton}
      onPress={removeVideo}
    >
      <Ionicons name="close" size={14} color="#fff" />
    </TouchableOpacity>
  </View>
)}

          {/* 🖼 IMAGES (UNCHANGED) */}
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.squareWrapper}>
              <Image source={{ uri }} style={styles.squareImage} />

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => removeImage(uri)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {Array.from({ length: remainingSlots }).map((_, i) => (
            <TouchableOpacity
              key={`empty-${i}`}
              style={styles.addSquare}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="image-outline" size={26} color="#8A8A8A" />
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* PICKER MODAL */}
<Modal
  visible={showPicker}
  transparent
  animationType="fade"
  onRequestClose={() => setShowPicker(false)}
>
  <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
    <View style={styles.modal}>
      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setShowPicker(false)
          setTimeout(() => {
            takePhoto()
          }, 300)
        }}
      >
        <Ionicons name="camera" size={20} color="#111" />
        <Text style={styles.optionText}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setShowPicker(false)
          setTimeout(() => {
            pickImage()
          }, 300)
        }}
      >
        <Ionicons name="images" size={20} color="#111" />
        <Text style={styles.optionText}>Choose from Library</Text>
      </TouchableOpacity>

      {/* 🔥 VIDEO OPTION */}
      <TouchableOpacity
        style={styles.option}
        onPress={() => {
          setShowPicker(false)
          setTimeout(() => {
            pickVideo()
          }, 300)
        }}
      >
        <Ionicons name="videocam" size={20} color="#111" />
        <Text style={styles.optionText}>Add Video</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, styles.cancel]}
        onPress={() => setShowPicker(false)}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </Pressable>
</Modal>
</View>
)
}

const styles = StyleSheet.create({
  fullBleedSection: { marginTop: 4 },
  inner: { paddingBottom: 4 },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  disclaimer: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },

  row: { flexDirection: "row", gap: 12 },

  squareWrapper: {
    width: 110,
    height: 110,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F3F3",
  },

  squareImage: {
    width: "100%",
    height: "100%",
  },

  videoBox: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  videoText: {
    color: "#fff",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },

  addSquare: {
    width: 110,
    height: 110,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#DADADA",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },

  addText: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    fontWeight: "500",
  },

  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: "82%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },

  optionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  cancel: {
    justifyContent: "center",
    marginTop: 6,
  },

  cancelText: {
    textAlign: "center",
    fontWeight: "700",
    color: "#999",
  },
})