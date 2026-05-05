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
  messageCount?: number
  onNotificationsPress?: () => void
  onMessagesPress?: () => void
}

export default function GlobalHeader({
  cartCount = 0,
  notifCount = 0,
  messageCount = 0,
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
        { paddingTop: insets.top },
      ]}
    >
      <View style={styles.inner}>
        {/* LEFT */}
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.iconButton}
          >
            <Ionicons
              name={
                isActive("/settings")
                  ? "settings"
                  : "settings-outline"
              }
              size={22}
              color={
                isActive("/settings")
                  ? "#D97732"
                  : "#0F172A"
              }
            />
          </TouchableOpacity>
        </View>

        {/* CENTER */}
        <Link href="/" asChild>
          <TouchableOpacity style={styles.centerBrandWrap}>
            <Text style={styles.brandText}>Melo</Text>
          </TouchableOpacity>
        </Link>

        {/* RIGHT */}
        <View style={styles.rightActions}>
          {/* NOTIFICATIONS */}
          <TouchableOpacity
            onPress={() =>
              onNotificationsPress
                ? onNotificationsPress()
                : router.push("/notifications")
            }
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={22} />

            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notifCount > 99 ? "99+" : notifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* MESSAGES */}
          <TouchableOpacity
            onPress={() =>
              onMessagesPress
                ? onMessagesPress()
                : router.push("/messages")
            }
            style={styles.iconButton}
          >
            <Ionicons
              name={
                isActive("/messages")
                  ? "chatbubble"
                  : "chatbubble-outline"
              }
              size={22}
            />

            {messageCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {messageCount > 99 ? "99+" : messageCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 🛒 CART (NEW) */}
          <TouchableOpacity
            onPress={() => router.push("/cart")}
            style={styles.iconButton}
          >
            <Ionicons
              name={
                isActive("/cart")
                  ? "cart"
                  : "cart-outline"
              }
              size={22}
            />

            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {cartCount > 99 ? "99+" : cartCount}
                </Text>
              </View>
            )}
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
  },
  leftActions: { flex: 1 },
  centerBrandWrap: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -24 }],
  },
  brandText: {
    fontSize: 28,
    fontWeight: "800",
  },
  rightActions: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    borderRadius: 999,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
})