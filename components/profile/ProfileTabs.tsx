import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type TabKey =
  | "listings"
  | "sent"
  | "received"
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
  { key: "sent", label: "Sent" },
  { key: "received", label: "Received" },
  { key: "reviews", label: "Reviews" },
]

export default function ProfileTabs({
  activeTab,
  onChange,
}: Props) {
  return (
    <View style={styles.wrapper}>
      {TABS.map((tab) => {
        const active =
          activeTab === tab.key

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.85}
            style={[
              styles.tab,
              active && styles.activeTab,
            ]}
            onPress={() =>
              onChange(tab.key)
            }
          >
            <Text
              style={[
                styles.tabText,
                active &&
                  styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 22,
    marginHorizontal: 20,
    backgroundColor: "#ECE9E4",
    borderRadius: 22,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTab: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },

  activeTabText: {
    color: "#111827",
    fontWeight: "700",
  },
})