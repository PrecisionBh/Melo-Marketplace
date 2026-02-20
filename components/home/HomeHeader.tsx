import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type Props = {
  hasUnreadNotifications: boolean
  hasUnreadMessages: boolean
  onNotificationsPress: () => void
  onMessagesPress: () => void
  onProfilePress: () => void
  onMenuPress: () => void // 🔥 NEW
}

export default function HomeHeader({
  hasUnreadNotifications,
  hasUnreadMessages,
  onNotificationsPress,
  onMessagesPress,
  onProfilePress,
  onMenuPress,
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        {/* 🍔 HAMBURGER MENU */}
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.menuBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>

        {/* LOGO (NON-BLOCKING) */}
        <Text style={styles.logo} pointerEvents="none">
          Melo
        </Text>

        {/* ICONS */}
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={onNotificationsPress}
            style={styles.iconWrap}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
            {hasUnreadNotifications && <View style={styles.redDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onMessagesPress}
            style={styles.iconWrap}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#ffffff"
            />
            {hasUnreadMessages && <View style={styles.redDot} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7}>
            <Ionicons
              name="person-circle-outline"
              size={30}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuBtn: {
    width: 36,
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 10, // 🔥 ensures it stays clickable above centered elements
  },
  logo: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
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
