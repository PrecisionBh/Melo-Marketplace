import * as ImagePicker from "expo-image-picker"
import { useState } from "react"
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

export default function BuyerRespondDisputeModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean
  onClose: () => void
  onSubmit?: (payload: {
    response: string
    images: string[]
  }) => void
}) {
  const [response, setResponse] =
    useState("")
  const [images, setImages] = useState<
    string[]
  >([])

  const pickImages = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync(
        {
          mediaTypes: ["images"],
          allowsMultipleSelection: true,
          quality: 0.9,
        }
      )

    if (!result.canceled) {
      setImages((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ])
    }
  }

  const removeImage = (uri: string) => {
    setImages((prev) =>
      prev.filter((img) => img !== uri)
    )
  }

  const handleSubmit = () => {
    onSubmit?.({
      response,
      images,
    })

    setResponse("")
    setImages([])

    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            Respond To Dispute
          </Text>

          <Text style={styles.label}>
            Your Response
          </Text>

          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Explain your side of the dispute..."
            value={response}
            onChangeText={setResponse}
          />

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={pickImages}
          >
            <Text style={styles.uploadText}>
              Add Supporting Photos
            </Text>
          </TouchableOpacity>

          <ScrollView horizontal>
            {images.map((img) => (
              <View
                key={img}
                style={styles.previewWrap}
              >
                <Image
                  source={{ uri: img }}
                  style={styles.preview}
                />

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() =>
                    removeImage(img)
                  }
                >
                  <Text
                    style={
                      styles.deleteText
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
          >
            <Text style={styles.submitText}>
              Submit Response
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
          >
            <Text style={styles.cancel}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    maxHeight: "90%",
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  textArea: {
    minHeight: 120,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlignVertical: "top",
    marginBottom: 12,
  },

  uploadBtn: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  uploadText: {
    color: "#D97732",
    fontWeight: "800",
    fontSize: 14,
  },

  previewWrap: {
    marginRight: 10,
    position: "relative",
  },

  preview: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },

  deleteBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  submitBtn: {
    backgroundColor: "#D97732",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 14,
  },

  submitText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  cancel: {
    marginTop: 14,
    textAlign: "center",
    color: "#6B7280",
    fontWeight: "700",
  },
})