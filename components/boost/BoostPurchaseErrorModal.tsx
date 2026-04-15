import { Ionicons } from "@expo/vector-icons"
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function BoostPurchaseErrorModal({
  visible,
  onClose,
  message,
}: {
  visible: boolean
  onClose: () => void
  message?: string
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="alert-circle"
              size={54}
              color="#DC2626"
            />
          </View>

          <Text style={styles.title}>
            Purchase Failed
          </Text>

          <Text style={styles.sub}>
            {message ??
              "Something went wrong processing your purchase."}
          </Text>

          <TouchableOpacity
            style={styles.btn}
            onPress={onClose}
          >
            <Text style={styles.btnText}>
              Try Again
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
      "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },

  iconWrap: {
    marginBottom: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },

  sub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  btn: {
    width: "100%",
    backgroundColor: "#DC2626",
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
})