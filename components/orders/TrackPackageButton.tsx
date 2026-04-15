import { Linking, StyleSheet, Text, TouchableOpacity } from "react-native"

type Props = {
  trackingUrl?: string | null
}

export default function TrackPackageButton({
  trackingUrl,
}: Props) {
  if (!trackingUrl) return null

  const openTracking = async () => {
    await Linking.openURL(trackingUrl)
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={openTracking}
      activeOpacity={0.85}
    >
      <Text style={styles.text}>Track Package</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
  backgroundColor: "#D97732",
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 14,
  marginBottom: 14,
},

  text: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
})