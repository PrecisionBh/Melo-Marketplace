import { Ionicons } from "@expo/vector-icons"
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Option = {
  label: string
  value: string
}

type Props = {
  visible: boolean
  title: string
  options: Option[]
  selectedValue?: string | null
  onSelect: (value: string) => void
  onClose: () => void
}

export default function FullScreenSelector({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#0F1E17" />
          </TouchableOpacity>

          <Text style={styles.title}>{title}</Text>

          {/* Spacer to balance header */}
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.divider} />

        {/* Options List (Scrollable + Safe Bottom Padding) */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces
        >
          {options.map((option) => {
            const isSelected = selectedValue === option.value

            return (
              <TouchableOpacity
                key={option.value}
                style={styles.optionRow}
                onPress={() => {
                  onSelect(option.value)
                  onClose()
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.optionText}>{option.label}</Text>

                {isSelected && (
                  <Ionicons name="checkmark" size={20} color="#0F1E17" />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F8F5", // Melo soft green background
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },
  divider: {
    height: 1,
    backgroundColor: "#DCEAE4",
    marginTop: 16,
    marginBottom: 8,
  },
  scrollContent: {
    paddingBottom: 120, // 🔥 prevents "Other" from being hidden behind nav bar
    flexGrow: 1,
  },
  optionRow: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E3EFE9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 16,
    color: "#0F1E17",
    fontWeight: "600",
  },
})