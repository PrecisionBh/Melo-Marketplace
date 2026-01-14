import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

export default function ProfileScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  /* ---------------- LOAD PROFILE (REFRESH ON FOCUS) ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return

      const loadProfile = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", session.user.id)
          .single()

        if (!error && data) {
          setDisplayName(data.display_name ?? null)
          setAvatarUrl(data.avatar_url ?? null)
        }
      }

      loadProfile()
    }, [session?.user?.id])
  )

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* PROFILE CARD */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          onPress={() => router.push("/settings/edit-profile")}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require("../assets/images/avatar-placeholder.png")}
                style={styles.avatar}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings/edit-profile")}
          activeOpacity={0.8}
        >
          <Text style={styles.name}>
            {displayName ?? "Your Name"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.username}>
          {session?.user?.email ?? ""}
        </Text>
      </View>

      {/* MENU */}
      <View style={styles.menu}>
        <MenuItem
          icon="pricetag-outline"
          label="Selling"
          onPress={() => router.push("/selling")}
        />

        <MenuItem
          icon="bag-outline"
          label="Buying"
          onPress={() => router.push("/buying")}
        />

        <MenuItem
          icon="heart-outline"
          label="Watching"
          onPress={() => router.push("/watching")}
        />

        <MenuItem
          icon="settings-outline"
          label="Settings"
          onPress={() => router.push("/settings")}
        />
      </View>

      {/* BACK */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/home")}
      >
        <Text style={styles.backText}>← Back to Home</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ================= MENU ITEM ================= */

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: any
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F1E17" />
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9FB8AC"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  )
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    alignItems: "center",
    backgroundColor: "#0F1E17",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E8F5EE",
  },

  profileCard: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#EAF4EF",
  },

  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#24352D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  name: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F1E17",
  },

  username: {
    fontSize: 13,
    color: "#6B8F7D",
    marginTop: 2,
  },

  menu: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEA",
  },

  menuText: {
    marginLeft: 14,
    fontSize: 15,
    color: "#0F1E17",
    fontWeight: "500",
  },

  backBtn: {
    marginTop: 20,
    alignItems: "center",
  },

  backText: {
    color: "#7FAF9B",
    fontWeight: "600",
  },
})
