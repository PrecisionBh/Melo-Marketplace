import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native"
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
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const navigate = (route: string) => {
    setMenuOpen(false)
    router.push(route as any)
  }

  return (
    <>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          {/* 🍔 HAMBURGER MENU */}
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            style={styles.menuBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={26} color="#ffffff" />
          </TouchableOpacity>

          {/* LOGO */}
          <Text style={styles.logo}>Melo</Text>

          {/* RIGHT ICONS */}
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={onNotificationsPress}
              style={styles.iconWrap}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#ffffff"
              />
              {hasUnreadNotifications && <View style={styles.redDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onMessagesPress}
              style={styles.iconWrap}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={22}
                color="#ffffff"
              />
              {hasUnreadMessages && <View style={styles.redDot} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={onProfilePress}>
              <Ionicons
                name="person-circle-outline"
                size={30}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 🔥 DROPDOWN MENU (TOP-LEFT ANCHORED) */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
          <View style={styles.overlay}>
            <View style={[styles.dropdown, { top: insets.top + 60 }]}>
              <MenuItem label="Buyer Hub" onPress={() => navigate("/buyer-hub")} />
              <MenuItem label="Seller Hub" onPress={() => navigate("/seller-hub")} />
              <MenuItem label="Wallet" onPress={() => navigate("/seller-hub/wallet")} />
              <MenuItem label="Edit Profile" onPress={() => navigate("/edit-profile")} />
              <MenuItem label="Settings" onPress={() => navigate("/settings")} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}

function MenuItem({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 100,
  },

  headerRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  menuBtn: {
    width: 36,
    alignItems: "flex-start",
    justifyContent: "center",
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

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  dropdown: {
    position: "absolute", // 🔥 CRITICAL FIX
    left: 16,
    width: 220,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },

  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  menuText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },
})
