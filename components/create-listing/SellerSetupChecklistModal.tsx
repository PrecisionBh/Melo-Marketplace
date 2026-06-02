import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  visible: boolean
  hasAddress: boolean
  hasPayoutMethod: boolean
  onClose: () => void
}

export default function SellerSetupChecklistModal(props: Props) {
  const router = useRouter()

  const completed =
    (props.hasAddress ? 1 : 0) +
    (props.hasPayoutMethod ? 1 : 0)

  return (
    <Modal
      visible={props.visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            Complete Seller Setup
          </Text>

          <Text style={styles.subtitle}>
            Complete these steps before creating listings.
          </Text>

          <View style={styles.row}>
            <Ionicons
              name={
                props.hasAddress
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              size={26}
              color={
                props.hasAddress
                  ? "#D97732"
                  : "#BDBDBD"
              }
            />

            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                Return Address
              </Text>

              <Text style={styles.rowSub}>
                Required for shipping and returns.
              </Text>
            </View>

            {!props.hasAddress && (
              <TouchableOpacity
                style={styles.setupBtn}
                onPress={() => {
                  props.onClose()
                  router.push("/settings/edit-profile")
                }}
              >
                <Text style={styles.setupText}>
                  Setup
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.row}>
            <Ionicons
              name={
                props.hasPayoutMethod
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              size={26}
              color={
                props.hasPayoutMethod
                  ? "#D97732"
                  : "#BDBDBD"
              }
            />

            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                Payout Method
              </Text>

              <Text style={styles.rowSub}>
                Required to receive seller payouts.
              </Text>
            </View>

            {!props.hasPayoutMethod && (
              <TouchableOpacity
                style={styles.setupBtn}
                onPress={() => {
                  props.onClose()
                  router.push("/wallet")
                }}
              >
                <Text style={styles.setupText}>
                  Setup
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.progress}>
            {completed} of 2 completed
          </Text>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={props.onClose}
          >
            <Text style={styles.closeText}>
              Close
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
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  rowText: {
    flex: 1,
    marginLeft: 12,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  rowSub: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },

  setupBtn: {
    backgroundColor: "#D97732",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  setupText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  progress: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: "#D97732",
  },

  closeBtn: {
    marginTop: 16,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  closeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
})