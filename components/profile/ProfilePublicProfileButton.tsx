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
      <Text style={styles.text}>
        View public profile
      </Text>

      <View style={styles.iconWrap}>
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#6B7280"
        />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    marginTop: 18,
    marginHorizontal: 20,
    backgroundColor: "#F8F8F7",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECECEC",
    paddingHorizontal: 20,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  text: {
    fontSize: 18,
    fontWeight: "500",
    color: "#374151",
  },

  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
})