import { useAuth } from "@/context/AuthContext"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function ProfilePublicProfileButton() {
  const router = useRouter()
  const { session } = useAuth()

  const userId = session?.user?.id

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.button}
      onPress={() => {
        if (!userId) return
        router.push(`/public-profile/${userId}`)
      }}
    >
      {/* LEFT */}
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <Ionicons
            name="person-outline"
            size={16}
            color="#D97732"
          />
        </View>

        <View>
          <Text style={styles.title}>Public Profile</Text>
          <Text style={styles.subtitle}>
            See how others view your page
          </Text>
        </View>
      </View>

      {/* RIGHT */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9CA3AF"
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(217,119,50,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
})