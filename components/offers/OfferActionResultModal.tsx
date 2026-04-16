import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function OfferActionResultModal({
  visible,
  title,
  message,
  primaryText = "Done",
  secondaryText,
  onPrimary,
  onSecondary,
  onClose,
}: {
  visible: boolean
  title: string
  message: string
  primaryText?: string
  secondaryText?: string
  onPrimary: () => void
  onSecondary?: () => void
  onClose: () => void
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.message}>
            {message}
          </Text>

          <View style={styles.actions}>
            {secondaryText && onSecondary && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSecondary}
              >
                <Text
                  style={styles.secondaryText}
                >
                  {secondaryText}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onPrimary}
            >
              <Text style={styles.primaryText}>
                {primaryText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },

  message: {
    fontSize: 14,
    color: "#555",
    lineHeight: 21,
    marginBottom: 22,
  },

  actions: {
    gap: 10,
  },

  primaryBtn: {
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

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 14,
  },
})