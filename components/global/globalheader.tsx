import { Ionicons } from "@expo/vector-icons"
import { Link, usePathname, useRouter } from "expo-router"
import React from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type GlobalHeaderProps = {
  cartCount?: number
  notifCount?: number
  onNotificationsPress?: () => void
  onMessagesPress?: () => void
}

export default function GlobalHeader({
  cartCount = 0,
  notifCount = 0,
  onNotificationsPress,
  onMessagesPress,
}: GlobalHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.leftSpacer} />

        <Link href="/" asChild>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.centerBrandWrap}
          >
            <Text style={styles.brandText}>Melo</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={() => {
              if (onNotificationsPress) onNotificationsPress()
              else router.push("/notifications")
            }}
            activeOpacity={0.8}
            style={styles.iconButton}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#0F172A"
            />

            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notifCount > 99 ? "99+" : notifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (onMessagesPress) onMessagesPress()
              else router.push("/messages")
            }}
            activeOpacity={0.8}
            style={styles.iconButton}
          >
            <Ionicons
              name={
                isActive("/messages")
                  ? "chatbubble"
                  : "chatbubble-outline"
              }
              size={22}
              color={
                isActive("/messages")
                  ? "#D97732"
                  : "#0F172A"
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#F6EFE8",
    borderBottomWidth: 1,
    borderBottomColor: "#D97732",
  },

  inner: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  leftSpacer: {
    flex: 1,
  },

  centerBrandWrap: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -24 }],
  },

  brandText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },

  rightActions: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
})