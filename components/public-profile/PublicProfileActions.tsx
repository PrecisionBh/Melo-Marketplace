import React from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  isFollowing: boolean
  loading?: boolean
  messageLoading?: boolean
  onFollowToggle: () => void
  onMessage: () => void
}

export default function PublicProfileActions({
  isFollowing,
  loading = false,
  messageLoading = false,
  onFollowToggle,
  onMessage,
}: Props) {
  return (
    <View style={styles.container}>
      {/* FOLLOW BUTTON */}
      <TouchableOpacity
        onPress={onFollowToggle}
        disabled={loading}
        activeOpacity={0.7}
        style={[
          styles.followBtn,
          isFollowing && styles.followingBtn,
          loading && { opacity: 0.6 },
        ]}
      >
        <Text
          style={[
            styles.followText,
            isFollowing && styles.followingText,
          ]}
        >
          {loading
            ? "..."
            : isFollowing
            ? "Following"
            : "Follow"}
        </Text>
      </TouchableOpacity>

      {/* MESSAGE BUTTON */}
      <TouchableOpacity
        onPress={onMessage}
        disabled={messageLoading}
        activeOpacity={0.7}
        style={[
          styles.messageBtn,
          messageLoading && { opacity: 0.6 },
        ]}
      >
        <Text style={styles.messageText}>
          {messageLoading ? "..." : "Message"}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },

  /* FOLLOW */
  followBtn: {
    flex: 1,
    backgroundColor: "#D97732",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D97732",
  },

  followText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  followingText: {
    color: "#D97732",
  },

  /* MESSAGE */
  messageBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0F1E17",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  messageText: {
    color: "#0F1E17",
    fontWeight: "800",
    fontSize: 14,
  },
})