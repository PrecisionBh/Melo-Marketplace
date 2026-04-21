import {
    Image,
    StyleSheet,
    Text,
    View,
} from "react-native"

type Props = {
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  isPro?: boolean
}

export default function PublicProfileHeader({
  displayName,
  bio,
  avatarUrl,
  isPro,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <Image
        source={
          avatarUrl
            ? { uri: avatarUrl }
            : require("@/assets/images/avatar-placeholder.png")
        }
        style={styles.avatar}
      />

      {/* Name + Pro Badge */}
      <View style={styles.nameRow}>
        <Text style={styles.name}>
          {displayName ?? "User"}
        </Text>

        {isPro && (
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {bio && (
        <Text style={styles.bio}>
          {bio}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  name: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F1E17",
  },

  proBadge: {
    backgroundColor: "#D97732",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  proText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F1E17",
  },

  bio: {
    marginTop: 8,
    fontSize: 13,
    color: "#000000",
    textAlign: "center",
    lineHeight: 18,
  },
})