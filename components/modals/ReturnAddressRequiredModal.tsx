import { useRouter } from "expo-router"
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  visible: boolean
  onClose: () => void
}

export default function ReturnAddressRequiredModal({
  visible,
  onClose,
}: Props) {
  const router = useRouter()

  const goToAddress = () => {
    onClose()
    router.push("../seller-hub/return-address")
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Return Address Required</Text>

          <Text style={styles.desc}>
            To protect buyers and ensure smooth returns, sellers must
            have a return address on file before creating listings.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={goToAddress}>
            <Text style={styles.primaryText}>Add / Update Return Address</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    color: "#3E5F54",
    marginBottom: 20,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: "#0F1E17",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF4EF",
  },
  secondaryText: {
    color: "#2E5F4F",
    fontWeight: "700",
  },
})
