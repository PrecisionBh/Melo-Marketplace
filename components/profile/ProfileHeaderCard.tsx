import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function ProfileHeaderCard() {
  const router = useRouter()
  const { session } = useAuth()

  const userId = session?.user?.id ?? null

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!userId) return

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, bio, avatar_url")
          .eq("id", userId)
          .single()

        if (error) throw error

        setDisplayName(data?.display_name ?? "")
        setBio(data?.bio ?? "")
        setAvatarUrl(data?.avatar_url ?? null)
      } catch (err) {
        handleAppError(err, {
          context: "profile_header_load",
          fallbackMessage: "Failed to load profile.",
        })
      }
    }

    loadProfile()
  }, [userId])

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      })

      if (result.canceled) return

      await uploadAvatar(result.assets[0].uri)
    } catch (err) {
      handleAppError(err, {
        context: "profile_header_pick_image",
      })
    }
  }

  const uploadAvatar = async (uri: string) => {
    if (!userId) return

    try {
      setUploading(true)

      const path = `${userId}.jpg`

      const formData = new FormData()
      formData.append("file", {
        uri,
        name: path,
        type: "image/jpeg",
      } as any)

      const { error } = await supabase.storage
        .from("profile-images")
        .upload(path, formData, { upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path)

      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`)

      await supabase
        .from("profiles")
        .update({
          avatar_url: urlData.publicUrl,
        })
        .eq("id", userId)
    } catch (err) {
      handleAppError(err, {
        context: "profile_header_upload_avatar",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    if (!userId) return

    try {
      setAvatarUrl(null)

      await supabase
        .from("profiles")
        .update({
          avatar_url: null,
        })
        .eq("id", userId)
    } catch (err) {
      handleAppError(err, {
        context: "profile_header_remove_avatar",
      })
    }
  }

  return (
    <View style={styles.wrapper}>
      {/* TOP ROW */}
      <View style={styles.topRow}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={42} color="#94A3B8" />
            )}

            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={pickImage}
              disabled={uploading}
            >
              <Ionicons name="camera" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.photoActions}>
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changePhoto}>
                {uploading ? "Uploading..." : "Change photo"}
              </Text>
            </TouchableOpacity>

            {avatarUrl && (
              <TouchableOpacity onPress={removeAvatar}>
                <Text style={styles.removePhoto}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.rightInfo}>
          <View style={styles.usernameRow}>
            <Text numberOfLines={1} style={styles.username}>
              @{displayName?.replace(/\s+/g, "") || "username"}
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/settings/edit-profile")}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* BIO FULL WIDTH */}
      <View style={styles.bioRow}>
        <Text style={styles.bio}>
          {bio || "Add your bio"}
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/settings/edit-profile")}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  avatarSection: {
    marginRight: 18,
  },

  avatarWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 54,
  },

  cameraBtn: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D97732",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F8F5F0",
  },

  photoActions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 14,
  },

  changePhoto: {
    fontSize: 14,
    fontWeight: "500",
    color: "#D97732",
  },

  removePhoto: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
  },

  rightInfo: {
    flex: 1,
    paddingTop: 14,
  },

  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  username: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
  },

  bioRow: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bio: {
    flex: 1,
    fontSize: 17,
    color: "#4B5563",
    marginRight: 12,
  },
})