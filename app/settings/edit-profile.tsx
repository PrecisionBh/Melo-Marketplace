import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"

export default function EditProfileScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  /* ---------------- LOAD PROFILE ---------------- */

  useEffect(() => {
    if (!userId) {
      handleAppError(new Error("Missing user session"), {
        context: "edit_profile_no_user",
        silent: true,
      })
      return
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, bio, avatar_url")
          .eq("id", userId)
          .single()

        if (error) throw error

        if (data) {
          setDisplayName(data.display_name ?? "")
          setBio(data.bio ?? "")
          setAvatarUrl(data.avatar_url ?? null)
        }
      } catch (err) {
        handleAppError(err, {
          context: "edit_profile_load",
          fallbackMessage: "Failed to load profile.",
        })
      }
    }

    loadProfile()
  }, [userId])

  /* ---------------- IMAGE PICK ---------------- */

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      })

      if (result.canceled) return

      await uploadAvatar(result.assets[0].uri)
    } catch (err) {
      handleAppError(err, {
        context: "edit_profile_image_picker",
        fallbackMessage: "Failed to select image. Please try again.",
      })
    }
  }

  /* ---------------- AVATAR UPLOAD ---------------- */

  const uploadAvatar = async (uri: string) => {
    if (!userId) {
      handleAppError(new Error("Missing user ID"), {
        context: "edit_profile_upload_no_user",
        silent: true,
      })
      return
    }

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

      if (!urlData?.publicUrl) {
        throw new Error("Failed to retrieve public URL")
      }

      setAvatarUrl(urlData.publicUrl)
    } catch (err) {
      handleAppError(err, {
        context: "edit_profile_avatar_upload",
        fallbackMessage: "Profile photo upload failed. Please try again.",
      })
    } finally {
      setUploading(false)
    }
  }

  /* ---------------- SAVE PROFILE ---------------- */

  const saveProfile = async () => {
    if (!userId) {
      handleAppError(new Error("Missing user session"), {
        context: "edit_profile_save_no_user",
        silent: true,
      })
      return
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", userId)

      if (error) throw error

      Alert.alert("Success", "Profile updated successfully.")
      router.back()
    } catch (err) {
      handleAppError(err, {
        context: "edit_profile_save",
        fallbackMessage: "Failed to save profile changes.",
      })
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Edit Profile"
        backLabel="Settings"
        backRoute="/settings"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={48} color="#7FAF9B" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhoto}>
            {uploading ? "Uploading..." : "Change Profile Photo"}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            style={[styles.input, styles.bio]}
            multiline
            maxLength={200}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  /* (Old header styles kept but unused during polish phase) */
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  headerBtn: {
    alignItems: "center",
    minWidth: 60,
  },

  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#0F1E17",
  },

  avatarSection: {
    alignItems: "center",
    marginTop: 20,
  },

  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#24352D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  changePhoto: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#7FAF9B",
  },

  form: {
    marginTop: 30,
    paddingHorizontal: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B8F7D",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 18,
  },

  bio: {
    height: 100,
    textAlignVertical: "top",
  },

  saveBtn: {
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: "#0F1E17",
    borderRadius: 22,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
})
