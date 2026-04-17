import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  visible: boolean
  carrier: string
  setCarrier: (val: string) => void
  tracking: string
  setTracking: (val: string) => void
  onClose: () => void
  onSubmit: () => void
  loading?: boolean
}

export default function AddTrackingModal({
  visible,
  carrier,
  setCarrier,
  tracking,
  setTracking,
  onClose,
  onSubmit,
  loading,
}: Props) {
  if (!visible) return null

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Add Tracking
        </Text>

        {/* CARRIER */}
        <Text style={styles.label}>
          Select Carrier
        </Text>

        <View style={styles.row}>
          {["USPS", "UPS", "FedEx", "DHL"].map(
            (c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.pill,
                  carrier === c && styles.pillActive,
                ]}
                onPress={() => setCarrier(c)}
              >
                <Text
                  style={[
                    styles.pillText,
                    carrier === c &&
                      styles.pillTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* TRACKING */}
        <Text style={styles.label}>
          Tracking Number
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter tracking number"
          value={tracking}
          onChangeText={setTracking}
        />

        {/* SUBMIT */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              Mark Shipped
            </Text>
          )}
        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onClose}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

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
    maxHeight: "65%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },

  pillActive: {
    backgroundColor: "#D97732",
  },

  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },

  pillTextActive: {
    color: "#fff",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },

  submitBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },

  submitText: {
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