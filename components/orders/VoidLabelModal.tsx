import React, { useState } from "react"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  visible: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  loading?: boolean
}

const VoidLabelModal = ({
  visible,
  onClose,
  onConfirm,
  loading,
}: Props) => {
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  if (!visible) return null

  const handleConfirm = async () => {
    if (loading) return

    try {
      setErrorMsg("")
      setSuccess(false)

      await onConfirm()

      setSuccess(true)

      // 🔥 fallback alert (optional but nice)
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      console.log("Void error:", err)
      setErrorMsg("Failed to void label. Please try again.")
    }
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Void Shipping Label
        </Text>

        <Text style={styles.sub}>
          This will cancel the shipping label and issue a refund from EasyPost.
        </Text>

        <Text style={styles.warning}>
          Only void labels that have NOT been used.
        </Text>

        {/* 🔥 SUCCESS */}
        {success && (
          <Text style={styles.success}>
            Label voided successfully
          </Text>
        )}

        {/* 🔥 ERROR */}
        {!!errorMsg && (
          <Text style={styles.error}>
            {errorMsg}
          </Text>
        )}

        {/* CONFIRM */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            loading && { opacity: 0.7 },
          ]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>
              Yes, Void Label
            </Text>
          )}
        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default VoidLabelModal

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },

  sub: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },

  warning: {
    fontSize: 12,
    color: "#DC2626",
    marginBottom: 12,
  },

  success: {
    color: "#16A34A",
    fontWeight: "700",
    marginBottom: 10,
  },

  error: {
    color: "#DC2626",
    fontWeight: "700",
    marginBottom: 10,
  },

  confirmBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "800",
  },

  cancelBtn: {
    marginTop: 10,
    alignItems: "center",
  },

  cancelText: {
    color: "#6B7280",
  },
})