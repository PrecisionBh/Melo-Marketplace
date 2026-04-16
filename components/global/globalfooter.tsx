import { Ionicons } from "@expo/vector-icons"
import {
    usePathname,
    useRouter,
} from "expo-router"
import React from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useCart } from "@/context/CartContext"

type IoniconName =
  React.ComponentProps<
    typeof Ionicons
  >["name"]

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
    path: "/seller-hub/create-listing",
    icon: "add-circle-outline",
    activeIcon: "add-circle",
    label: "Sell",
  },
  {
    path: "/cart",
    icon: "cart-outline",
    activeIcon: "cart",
    label: "Cart",
  },
  {
    path: "/orders",
    icon: "clipboard-outline",
    activeIcon: "clipboard",
    label: "Orders",
  },
  {
    path: "/profile",
    icon: "person-outline",
    activeIcon: "person",
    label: "Profile",
  },
]

export default function GlobalFooter() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const { cartCount } = useCart()

  const isActive = (path: string) => {
    return (
      pathname === path ||
      pathname.startsWith(path + "/")
    )
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(
            insets.bottom,
            8
          ),
        },
      ]}
    >
      <View style={styles.inner}>
        {NAV_ITEMS.map((item) => {
          const active =
            isActive(item.path)

          return (
            <TouchableOpacity
              key={item.path}
              onPress={() =>
                router.push(
                  item.path as any
                )
              }
              activeOpacity={0.8}
              style={styles.navItem}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={
                    active
                      ? item.activeIcon
                      : item.icon
                  }
                  size={22}
                  color={
                    active
                      ? "#D97732"
                      : "#6B7280"
                  }
                />

                {item.path === "/cart" &&
                  cartCount > 0 && (
                    <View
                      style={
                        styles.cartBadge
                      }
                    >
                      <Text
                        style={
                          styles.cartBadgeText
                        }
                      >
                        {cartCount > 99
                          ? "99+"
                          : cartCount}
                      </Text>
                    </View>
                  )}
              </View>

              <Text
                style={[
                  styles.label,
                  active &&
                    styles.labelActive,
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
    zIndex: 999,
    elevation: 20,
    backgroundColor:
      "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  inner: {
    height: 64,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 12,
  },

  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
  },

  labelActive: {
    color: "#D97732",
  },

  cartBadge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
})