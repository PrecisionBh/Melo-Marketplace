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

import { useAuth } from "../../context/AuthContext"
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
    if (!userId) return

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", userId)
        .single()

      console.log("LOAD PROFILE:", { data, error })

      if (!error && data) {
        setDisplayName(data.display_name ?? "")
        setBio(data.bio ?? "")
        setAvatarUrl(data.avatar_url ?? null)
      }
    }

    loadProfile()
  }, [userId])

  /* ---------------- IMAGE PICK ---------------- */

  const pickImage = async () => {
    console.log("PICK IMAGE CLICKED")

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    })

    console.log("IMAGE PICKER RESULT:", result)

    if (result.canceled) return

    uploadAvatar(result.assets[0].uri)
  }

  /* ---------------- AVATAR UPLOAD ---------------- */

  const uploadAvatar = async (uri: string) => {
    if (!userId) return

    try {
      setUploading(true)

      const path = `${userId}.jpg`
      console.log("UPLOAD PATH:", path)
      console.log("UPLOAD URI:", uri)

      const formData = new FormData()
      formData.append("file", {
        uri,
        name: path,
        type: "image/jpeg",
      } as any)

      console.log("FORMDATA READY")

      const { data, error } = await supabase.storage
        .from("profile-images")
        .upload(path, formData, {
          upsert: true,
        })

      console.log("UPLOAD RESPONSE:", { data, error })

      if (error) {
        Alert.alert("Upload failed", error.message)
        return
      }

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(path)

      console.log("PUBLIC URL:", urlData)

      setAvatarUrl(urlData.publicUrl)
    } catch (err) {
      console.error("UPLOAD CRASH:", err)
      Alert.alert("Upload error", "Unexpected upload error")
    } finally {
      setUploading(false)
    }
  }

  /* ---------------- SAVE PROFILE ---------------- */

  const saveProfile = async () => {
    if (!userId) return

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      })
      .eq("id", userId)

    console.log("SAVE PROFILE ERROR:", error)

    if (error) {
      Alert.alert("Save failed", error.message)
      return
    }

    router.back()
  }

  /* ---------------- UI ---------------- */

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 22 }} />
      </View>

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
        <Text style={styles.changePhoto}>Change Profile Photo</Text>
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
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
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
