import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"
import { useState } from "react"
import {
    Alert,
    Modal,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  listingId: string
  title?: string
  price?: number
}

export default function ShareListingButton({
  listingId,
  title = "Check out this listing",
  price,
}: Props) {
  const [open, setOpen] = useState(false)

  // ✅ OPTION B (matches your app.json scheme)
  const appUrl = `melomp://listing/${listingId}`
  const webUrl = `https://melomarketplace.app/l/${listingId}`

  const shareMessage = `${title}${price ? `\n$${price}` : ""}

Open in Melo:
${appUrl}

Or view on web:
${webUrl}`

  const handleCopy = async () => {
    await Clipboard.setStringAsync(webUrl)
    setOpen(false)

    Alert.alert("Copied!", "Link copied to clipboard")
  }

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title,
        message: shareMessage,
      })
      setOpen(false)
    } catch (error) {
      console.log("❌ Share error:", error)
    }
  }

  return (
    <>
      {/* 🔥 ICON BUTTON */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={styles.iconBtn}
        activeOpacity={0.6}
      >
        <Ionicons
          name="share-social-outline"
          size={22}
          color="#6B7280"
        />
      </TouchableOpacity>

      {/* MODAL */}
      <Modal visible={open} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Share Listing</Text>

            <Text style={styles.sub}>
              Share this listing or copy the link to post it anywhere.
            </Text>

            {/* 🔥 SHARE BUTTON */}
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleNativeShare}
            >
              <Text style={styles.copyText}>Share</Text>
            </TouchableOpacity>

            {/* 🔥 COPY LINK */}
            <TouchableOpacity
              style={[
                styles.copyBtn,
                { backgroundColor: "#374151" },
              ]}
              onPress={handleCopy}
            >
              <Text style={styles.copyText}>
                Copy Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOpen(false)}
            >
              <Text style={styles.cancel}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  iconBtn: {
    padding: 6,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    color: "#0F1E17",
  },

  sub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },

  copyBtn: {
    width: "100%",
    backgroundColor: "#D97732",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },

  copyText: {
    color: "#fff",
    fontWeight: "800",
  },

  cancel: {
    marginTop: 6,
    color: "#9CA3AF",
  },
})