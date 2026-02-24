import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  visible: boolean
  onAccept: () => void
  onCounter: () => void
  onDecline: () => void
  saving?: boolean
}

export default function OfferActions({
  visible,
  onAccept,
  onCounter,
  onDecline,
  saving = false,
}: Props) {
  if (!visible) return null

  return (
    <View style={styles.wrapper}>
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.acceptBtn, saving && styles.disabled]}
          onPress={onAccept}
          disabled={saving}
        >
          <Text style={styles.acceptText}>
            {saving ? "Processing..." : "Accept Offer"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.counterBtn, saving && styles.disabledOutline]}
          onPress={onCounter}
          disabled={saving}
        >
          <Text style={styles.counterText}>Counter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.declineBtn, saving && styles.disabledOutline]}
          onPress={onDecline}
          disabled={saving}
        >
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* OUTER WRAPPER = sits in normal layout flow (NOT floating) */
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20, // safe bottom spacing (home bar / gestures)
    backgroundColor: "#F6F7F8",
  },

  /* REMOVED absolute positioning completely */
  actionBar: {
    gap: 10,
  },

  acceptBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: "#1F7A63",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },

  acceptText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  counterBtn: {
    backgroundColor: "#E8F5EE",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#1F7A63",
  },

  counterText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#1F7A63",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  declineBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EB5757",
  },

  declineText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#EB5757",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  disabled: {
    opacity: 0.6,
  },

  disabledOutline: {
    opacity: 0.6,
  },
})