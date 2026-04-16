import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function OfferActionButtons({
  primaryText,
  secondaryText,
  tertiaryText,
  onPrimary,
  onSecondary,
  onTertiary,
}: {
  primaryText?: string
  secondaryText?: string
  tertiaryText?: string
  onPrimary?: () => void
  onSecondary?: () => void
  onTertiary?: () => void
}) {
  return (
    <View style={styles.stack}>
      {primaryText && (
        <TouchableOpacity
          style={styles.primary}
          onPress={onPrimary}
        >
          <Text style={styles.primaryText}>
            {primaryText}
          </Text>
        </TouchableOpacity>
      )}

      {secondaryText && (
        <TouchableOpacity
          style={styles.secondary}
          onPress={onSecondary}
        >
          <Text style={styles.secondaryText}>
            {secondaryText}
          </Text>
        </TouchableOpacity>
      )}

      {tertiaryText && (
        <TouchableOpacity
          style={styles.tertiary}
          onPress={onTertiary}
        >
          <Text style={styles.tertiaryText}>
            {tertiaryText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
    marginBottom: 16,
  },

  primary: {
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

  secondary: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  secondaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  tertiary: {
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  tertiaryText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 14,
  },
})