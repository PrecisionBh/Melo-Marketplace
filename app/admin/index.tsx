import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

/* ---------------- SCREEN ---------------- */

export default function AdminIndexScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/profile")}>
          <Ionicons name="arrow-back" size={22} color="#E8F5EE" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Admin Panel</Text>

        <View style={{ width: 22 }} />
      </View>

      {/* MENU */}
      <View style={styles.menu}>
        <AdminButton
          icon="alert-circle-outline"
          label="Disputes"
          onPress={() => router.push("/admin/disputes")}
        />

        <AdminButton
          icon="document-text-outline"
          label="Dispute Detail"
          onPress={() => router.push("/admin/dispute-detail")}
        />

        <AdminButton
          icon="notifications-outline"
          label="Send Notification"
          onPress={() => router.push("/admin/notify")}
        />

        <AdminButton
          icon="trash-outline"
          label="Remove Listing"
          onPress={() => router.push("/admin/remove-listing")}
        />
      </View>
    </View>
  )
}

/* ---------------- BUTTON ---------------- */

function AdminButton({
  icon,
  label,
  onPress,
}: {
  icon: any
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F1E17" />
      <Text style={styles.buttonText}>{label}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9FB8AC"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 14,
    backgroundColor: "#7FAF9B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
  },

  menu: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEA",
  },

  buttonText: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F1E17",
  },
})
