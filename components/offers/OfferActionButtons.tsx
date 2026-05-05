import { useState } from "react"
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function OfferActionButtons({
  primaryText,
  secondaryText,
  tertiaryText,
  onPrimary,
  onSecondary,
  onTertiary,
}: {
  primaryText?: string
  secondaryText?: string
  tertiaryText?: string
  onPrimary?: () => Promise<void> | void
  onSecondary?: () => Promise<void> | void
  onTertiary?: () => Promise<void> | void
}) {
  const [loading, setLoading] = useState<
    "primary" | "secondary" | "tertiary" | null
  >(null)

  const [successVisible, setSuccessVisible] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const handlePress = async (
    type: "primary" | "secondary" | "tertiary",
    action?: () => Promise<void> | void,
    successText?: string
  ) => {
    if (!action || loading) return

    try {
      setLoading(type)

      await action()

      setSuccessMessage(successText || "Success!")
      setSuccessVisible(true)

      setTimeout(() => {
        setSuccessVisible(false)
      }, 1500)
    } catch (err) {
      console.log("❌ Action error:", err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <View style={styles.stack}>
        {/* PRIMARY */}
        {primaryText && (
          <TouchableOpacity
            style={[
              styles.primary,
              loading && styles.disabled,
            ]}
            disabled={!!loading}
            onPress={() =>
              handlePress("primary", onPrimary, "Offer Accepted")
            }
          >
            {loading === "primary" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                {primaryText}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* SECONDARY */}
        {secondaryText && (
          <TouchableOpacity
            style={[
              styles.secondary,
              loading && styles.disabled,
            ]}
            disabled={!!loading}
            onPress={() =>
              handlePress("secondary", onSecondary, "Counter Sent")
            }
          >
            {loading === "secondary" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.secondaryText}>
                {secondaryText}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* TERTIARY */}
        {tertiaryText && (
          <TouchableOpacity
            style={[
              styles.tertiary,
              loading && styles.disabled,
            ]}
            disabled={!!loading}
            onPress={() =>
              handlePress("tertiary", onTertiary, "Offer Declined")
            }
          >
            {loading === "tertiary" ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.tertiaryText}>
                {tertiaryText}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 🔥 SUCCESS MODAL */}
      <Modal transparent visible={successVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.successText}>
              {successMessage}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
    marginBottom: 16,
  },

  primary: {
    backgroundColor: "#D97732",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  secondary: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  tertiary: {
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  tertiaryText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 14,
  },

  disabled: {
    opacity: 0.6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    backgroundColor: "#111827",
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 20,
  },

  successText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
})