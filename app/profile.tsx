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

import AppHeader from "@/components/app-header"
import { useAuth } from "../context/AuthContext"
import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

export default function ProfileScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const userId = session?.user?.id ?? null

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const showAdmin = true

  /* ---------------- LOAD PROFILE ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (!userId) return

      const loadProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", userId)
            .single()

          if (error) throw error

          if (data) {
            setDisplayName(data.display_name ?? null)
            setAvatarUrl(data.avatar_url ?? null)
          } else {
            // Fail-safe defaults (never show blank UI)
            setDisplayName(null)
            setAvatarUrl(null)
          }
        } catch (err) {
          handleAppError(err, {
            context: "profile_load",
            fallbackMessage: "Failed to load profile.",
          })
        }
      }

      loadProfile()
    }, [userId])
  )

  const handlePublicProfilePress = () => {
    if (!userId) return

    try {
      router.push(`/public-profile/${userId}`)
    } catch (err) {
      handleAppError(err, {
        context: "profile_public_navigation",
        fallbackMessage: "Unable to open public profile.",
      })
    }
  }

  const handleAdminPress = () => {
    try {
      router.push("/admin-panel")
    } catch (err) {
      handleAppError(err, {
        context: "admin_navigation",
        fallbackMessage: "Unable to open admin panel.",
      })
    }
  }

  return (
    <View style={styles.screen}>
      {/* GLOBAL MELO HEADER (WITH BACK TO HOME) */}
      <AppHeader
        title="Profile"
        backLabel="Home"
        backRoute="/"
      />

      {/* PROFILE CARD */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          onPress={() => router.push("/settings/edit-profile")}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <Image
                source={require("../assets/images/avatar-placeholder.png")}
                style={styles.avatar}
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings/edit-profile")}
        >
          <Text style={styles.name}>
            {displayName ?? "Your Name"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.username}>
          {session?.user?.email ?? ""}
        </Text>

        {/* 🔥 VIEW PUBLIC PROFILE BUTTON */}
        <TouchableOpacity
          style={styles.publicProfileBtn}
          onPress={handlePublicProfilePress}
          disabled={!userId}
        >
          <Text style={styles.publicProfileText}>
            View Public Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* MENU */}
      <View style={styles.menu}>
        <MenuItem
          icon="bag-outline"
          label="Buyers Hub"
          onPress={() => router.push("/buyer-hub")}
        />

        <MenuItem
          icon="pricetag-outline"
          label="Seller Hub"
          onPress={() => router.push("/seller-hub")}
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

        {showAdmin && (
          <MenuItem
            icon="shield-checkmark-outline"
            label="Admin Panel"
            onPress={handleAdminPress}
          />
        )}
      </View>

      {/* 🚀 BIG MELO ADMIN BUTTON (BOTTOM) */}
      {showAdmin && (
        <TouchableOpacity
          style={styles.bigAdminBtn}
          onPress={handleAdminPress}
          activeOpacity={0.9}
        >
          <Ionicons
            name="shield-checkmark"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.bigAdminText}>
            Open Admin Panel
          </Text>
        </TouchableOpacity>
      )}

      {/* BACK (UNCHANGED - kept as requested) */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.backText}>← Back to Home</Text>
      </TouchableOpacity>
    </View>
  )
}

/* ---------------- MENU ITEM ---------------- */

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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  profileCard: {
    alignItems: "center",
    paddingVertical: 20,
  },

  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#24352D",
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

  /* 🔥 PUBLIC PROFILE BUTTON */
  publicProfileBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1F7A63",
    borderRadius: 999,
  },

  publicProfileText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
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

  /* 🚀 BIG ADMIN BUTTON (MELO THEME) */
  bigAdminBtn: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: "#7FAF9B",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 3,
  },

  bigAdminText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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