import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function OrderFilterModal({
  visible,
  onClose,
  selectedStatuses,
  setSelectedStatuses,
  STATUS_CONFIG,
}: any) {
  const insets = useSafeAreaInsets()

  const statuses = [
    "paid",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
  ]

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={styles.title}>Filter Orders</Text>

          <View style={styles.wrap}>
            {statuses.map((status) => {
              const selected = selectedStatuses.includes(status)

              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.chip,
                    selected && styles.chipActive,
                  ]}
                  onPress={() => {
                    setSelectedStatuses((prev: string[]) =>
                      prev.includes(status)
                        ? prev.filter((s) => s !== status)
                        : [...prev, status]
                    )
                  }}
                >
                  <Text
                    style={[
                      styles.text,
                      selected && styles.textActive,
                    ]}
                  >
                    {STATUS_CONFIG[status]?.label ?? status}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* 🔥 ACTIONS FIXED */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => setSelectedStatuses([])}
            >
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={onClose}
            >
              <Text style={styles.applyText}>Apply</Text>
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 20, // 🔥 reduced so buttons sit lower
  },

  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  chipActive: {
    backgroundColor: "#D97732",
    borderColor: "#D97732",
  },

  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },

  textActive: {
    color: "#fff",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  resetText: {
    color: "#777",
    fontWeight: "600",
  },

  applyBtn: {
    backgroundColor: "#D97732",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  applyText: {
    color: "#fff",
    fontWeight: "700",
  },
})