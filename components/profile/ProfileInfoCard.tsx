import { StyleSheet, Text, TextInput, View } from "react-native"

type Props = {
  displayName: string
  setDisplayName: (v: string) => void
  bio: string
  setBio: (v: string) => void
}

export default function ProfileInfoCard({
  displayName,
  setDisplayName,
  bio,
  setBio,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Profile Information</Text>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        style={styles.input}
        placeholder="Enter display name"
        placeholderTextColor="#9BB8AC"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={[styles.input, styles.bio]}
        multiline
        maxLength={200}
        placeholder="Tell users about yourself..."
        placeholderTextColor="#9BB8AC"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 30,
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B8F7D",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#F7FBF9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    color: "#0F1E17",
  },

  bio: {
    height: 110,
    textAlignVertical: "top",
  },
})