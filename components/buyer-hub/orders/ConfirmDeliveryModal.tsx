import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  visible: boolean
  processing: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDeliveryModal({
  visible,
  processing,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Confirm Delivery?</Text>

          <Text style={styles.modalText}>
            Once confirmed, the seller will be paid and disputes will no longer
            be available.
          </Text>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={onConfirm}
            disabled={processing}
          >
            <Text style={styles.confirmText}>
              {processing ? "Processing…" : "Yes, Confirm Delivery"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} disabled={processing}>
            <Text style={styles.cancelText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    color: "#0F1E17",
  },

  modalText: {
    fontSize: 14,
    marginBottom: 20,
    color: "#333",
    lineHeight: 20,
  },

  confirmBtn: {
    backgroundColor: "#27AE60", // matches your confirm delivery button
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  cancelText: {
    marginTop: 12,
    textAlign: "center",
    color: "#7FAF9B",
    fontWeight: "700",
  },
})
