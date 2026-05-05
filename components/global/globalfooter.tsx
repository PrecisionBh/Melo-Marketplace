import { Ionicons } from "@expo/vector-icons"
import { usePathname, useRouter } from "expo-router"
import React from "react"
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { supabase } from "@/lib/supabase"

type IoniconName =
  React.ComponentProps<typeof Ionicons>["name"]

const NAV_ITEMS: {
  path: string
  icon: IoniconName
  activeIcon: IoniconName
  label: string
}[] = [
  {
    path: "/home",
    icon: "home-outline",
    activeIcon: "home",
    label: "Home",
  },
  {
    path: "/profile",
    icon: "person-outline",
    activeIcon: "person",
    label: "Profile",
  },
  {
    path: "/create-listing",
    icon: "add-circle-outline",
    activeIcon: "add-circle",
    label: "Sell",
  },
  {
    path: "/orders",
    icon: "clipboard-outline",
    activeIcon: "clipboard",
    label: "Orders",
  },
  {
    path: "/offers",
    icon: "pricetag-outline",
    activeIcon: "pricetag",
    label: "Offers",
  },
]

export default function GlobalFooter() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/")

  const requireAuth = async (path: string) => {
    const { data } = await supabase.auth.getSession()
    const isAuthed = !!data.session?.user

    if (path === "/home") {
      router.push(path as any)
      return
    }

    if (!isAuthed) {
      Alert.alert("Sign in required", "Please sign in.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign In",
          onPress: () => router.push("/signinscreen"),
        },
      ])
      return
    }

    router.push(path as any)
  }

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.inner}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)

          return (
            <TouchableOpacity
              key={item.path}
              onPress={() => requireAuth(item.path)}
              style={styles.navItem}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={22}
                color={active ? "#D97732" : "#6B7280"}
              />

              <Text
                style={[
                  styles.label,
                  active && styles.labelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inner: {
    height: 64,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    color: "#6B7280",
  },
  labelActive: {
    color: "#D97732",
  },
})