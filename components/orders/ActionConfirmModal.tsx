import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function ActionConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  processing = false,
  destructive = false,
  onConfirm,
  onClose,
}: {
  visible: boolean
  title: string
  message: string
  confirmText?: string
  processing?: boolean
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.message}>
            {message}
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={processing}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                destructive &&
                  styles.destructiveBtn,
              ]}
              onPress={onConfirm}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={styles.confirmText}
                >
                  {confirmText}
                </Text>
              )}
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

  modal: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 22,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  message: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 22,
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  cancelText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 14,
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: "#D97732",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  destructiveBtn: {
    backgroundColor: "#DC2626",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
})