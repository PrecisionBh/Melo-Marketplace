import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  onSubmit: () => void
  submitting: boolean
  disabled?: boolean
}

export default function CreateListingFooter({
  onSubmit,
  submitting,
  disabled = false,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        {/* Divider to separate from previous builder block */}
        <View style={styles.divider} />

        {/* CTA BUTTON */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (disabled || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={onSubmit}
          disabled={disabled || submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Create Listing</Text>
          )}
        </TouchableOpacity>

        {/* Subtext reassurance (marketplace UX best practice) */}
        <Text style={styles.helperText}>
          Your listing will go live immediately after creation.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* FULL BLEED — NO SIDE EDGES (matches your entire builder system) */
  section: {
    marginHorizontal: -16,
    backgroundColor: "#FFFFFF",
  },

  inner: {
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
    width: "100%",
    marginBottom: 18,
  },

  submitButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#0F1E17", // Melo primary dark
    alignItems: "center",
    justifyContent: "center",
  },

  submitButtonDisabled: {
    backgroundColor: "#9FAFA8",
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: "#323232", // your preferred subtext color
    textAlign: "center",
  },
})