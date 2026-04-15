import { Ionicons } from "@expo/vector-icons"
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
  max?: number
}

export default function ImageUpload({
  images,
  setImages,
  max = 5,
}: Props) {
  const [showPicker, setShowPicker] = useState(false)

  /* ---------------- LIBRARY ---------------- */

  const pickImage = async () => {
    try {
      setShowPicker(false)

      if (images.length >= max) {
        Alert.alert("Limit reached", `You can upload up to ${max} photos.`)
        return
      }

      const remainingSlots = max - images.length

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.35,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      })

      if (!result.canceled && result.assets?.length > 0) {
        const convertedUris = await Promise.all(
          result.assets.map(async (asset) => {
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
      }
    } catch (err) {
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
              <Ionicons
                name="image-outline"
                size={26}
                color="#8A8A8A"
              />

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
            <TouchableOpacity style={styles.option} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color="#111" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={pickImage}>
              <Ionicons name="images" size={20} color="#111" />
              <Text style={styles.optionText}>Choose from Library</Text>
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
  fullBleedSection: {
    marginTop: 4,
  },

  inner: {
    paddingBottom: 4,
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

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