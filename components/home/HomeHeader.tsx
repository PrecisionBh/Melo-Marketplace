import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type Props = {
  hasUnreadNotifications: boolean
  hasUnreadMessages: boolean
  onNotificationsPress: () => void
  onMessagesPress: () => void
  onProfilePress: () => void
}

export default function HomeHeader({
  hasUnreadNotifications,
  hasUnreadMessages,
  onNotificationsPress,
  onMessagesPress,
  onProfilePress,
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        {/* LEFT SPACER (balances icons on right) */}
        <View style={{ width: 24 }} />

        {/* LOGO */}
        <Text style={styles.logo}>Melo</Text>

        {/* ICONS */}
        <View style={styles.headerIcons}>
          {/* 🔔 Notifications */}
          <TouchableOpacity
            onPress={onNotificationsPress}
            style={styles.iconWrap}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#0F1E17"
            />
            {hasUnreadNotifications && <View style={styles.redDot} />}
          </TouchableOpacity>

          {/* 💬 Messages */}
          <TouchableOpacity
            onPress={onMessagesPress}
            style={styles.iconWrap}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#0F1E17"
            />
            {hasUnreadMessages && <View style={styles.redDot} />}
          </TouchableOpacity>

          {/* 👤 Profile */}
          <TouchableOpacity onPress={onProfilePress}>
            <Ionicons
              name="person-circle-outline"
              size={30}
              color="#0F1E17"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: "#7FAF9B", // 🔥 sage green
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },

  headerRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff", // 🔥 dark text
  },

  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  iconWrap: {
    position: "relative",
  },

  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4D4D",
  },
})
