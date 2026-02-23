import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  visible: boolean
  processing: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmReturnReceivedModal({
  visible,
  processing,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>Confirm Return Received?</Text>

          <Text style={styles.description}>
            By confirming, you are stating that you have received the returned
            item. This will automatically issue a refund to the buyer and cannot
            be undone. Escrow will be released as part of the refund process.
          </Text>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={onConfirm}
            disabled={processing}
          >
            <Text style={styles.confirmText}>
              {processing ? "Processing Refund…" : "Confirm & Issue Refund"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={processing}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2EFE8",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#2E5F4F",
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  confirmBtn: {
    backgroundColor: "#0F1E17", // Melo dark primary
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  cancelBtn: {
    backgroundColor: "#F4FAF7",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelText: {
    color: "#0F1E17",
    fontWeight: "800",
    fontSize: 14,
  },
})