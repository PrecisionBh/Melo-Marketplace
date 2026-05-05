import { useFocusEffect } from "expo-router"
import { useCallback } from "react"
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"

type TabKey =
  | "listings"
  | "reviews"

type Props = {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

const TABS: {
  key: TabKey
  label: string
}[] = [
  { key: "listings", label: "Listings" },
  { key: "reviews", label: "Reviews" },
]

export default function ProfileTabs({
  activeTab,
  onChange,
}: Props) {
  const { session } = useAuth()

  useFocusEffect(
    useCallback(() => {
      // no-op now
    }, [])
  )

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.85}
              style={styles.tab}
              onPress={() => onChange(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  active && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* 🔥 FULL WIDTH UNDERLINE TRACK */}
      <View style={styles.underlineWrap}>
        <View
          style={[
            styles.activeUnderline,
            activeTab === "listings"
              ? { left: "0%" }
              : { left: "50%" },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 22,
    marginHorizontal: 20,
  },

  tabsRow: {
    flexDirection: "row",
  },

  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },

  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },

  activeTabText: {
    color: "#D97732",
    fontWeight: "700",
  },

  underlineWrap: {
  marginTop: 8,
  height: 4,
  width: "100%",
  backgroundColor: "#E5E7EB",
  borderRadius: 10,
  overflow: "hidden",

  // 🔥 FIX: keep it above listings
  zIndex: 10,
  elevation: 10, // Android

  // 🔥 FIX: add separation
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",

  marginBottom: 10, // spacing from listings
},

activeUnderline: {
  position: "absolute",
  height: "100%",
  width: "50%",
  backgroundColor: "#D97732",
},
})