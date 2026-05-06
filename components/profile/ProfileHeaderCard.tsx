import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function ProfileHeaderCard() {
  const { session } = useAuth()

  const userId = session?.user?.id ?? null

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] =
    useState<string | null>(null)

  const [uploading, setUploading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [editModalVisible, setEditModalVisible] =
    useState(false)

  const [editType, setEditType] = useState<
    "username" | "bio"
  >("username")

  const [editValue, setEditValue] =
    useState("")

  useEffect(() => {
    if (!userId) return

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "display_name, bio, avatar_url"
          )
          .eq("id", userId)
          .single()

        if (error) throw error

        setDisplayName(
          data?.display_name ?? ""
        )

        setBio(data?.bio ?? "")

        setAvatarUrl(
          data?.avatar_url ?? null
        )
      } catch (err) {
        handleAppError(err, {
          context: "profile_header_load",
          fallbackMessage:
            "Failed to load profile.",
        })
      }
    }

    loadProfile()
  }, [userId])

  const pickImage = async () => {
    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        })

      if (result.canceled) return

      await uploadAvatar(
        result.assets[0].uri
      )
    } catch (err) {
      handleAppError(err, {
        context:
          "profile_header_pick_image",
      })
    }
  }

  const uploadAvatar = async (
    uri: string
  ) => {
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

      const { error } =
        await supabase.storage
          .from("profile-images")
          .upload(path, formData, {
            upsert: true,
          })

      if (error) throw error

      const { data: urlData } =
        supabase.storage
          .from("profile-images")
          .getPublicUrl(path)

      setAvatarUrl(
        `${urlData.publicUrl}?t=${Date.now()}`
      )

      await supabase
        .from("profiles")
        .update({
          avatar_url:
            urlData.publicUrl,
        })
        .eq("id", userId)
    } catch (err) {
      handleAppError(err, {
        context:
          "profile_header_upload_avatar",
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
        context:
          "profile_header_remove_avatar",
      })
    }
  }

  const openUsernameEditor = () => {
    setEditType("username")
    setEditValue(displayName)
    setEditModalVisible(true)
  }

  const openBioEditor = () => {
    setEditType("bio")
    setEditValue(bio)
    setEditModalVisible(true)
  }

  const saveEdit = async () => {
    if (!userId) return

    try {
      setSaving(true)

      const clean =
        editValue.trim()

      const updates =
        editType === "username"
          ? {
              display_name: clean,
            }
          : {
              bio: clean,
            }

      const { error } =
        await supabase
          .from("profiles")
          .update(updates)
          .eq("id", userId)

      if (error) throw error

      if (editType === "username") {
        setDisplayName(clean)
      } else {
        setBio(clean)
      }

      setEditModalVisible(false)
    } catch (err) {
      handleAppError(err, {
        context:
          "profile_header_save_edit",
        fallbackMessage:
          "Failed to update profile.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <View style={styles.wrapper}>
        {/* TOP ROW */}
        <View style={styles.topRow}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image
                  source={{
                    uri: avatarUrl,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons
                  name="person"
                  size={42}
                  color="#94A3B8"
                />
              )}

              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={pickImage}
                disabled={uploading}
              >
                <Ionicons
                  name="camera"
                  size={18}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.photoActions
              }
            >
              <TouchableOpacity
                onPress={pickImage}
              >
                <Text
                  style={
                    styles.changePhoto
                  }
                >
                  {uploading
                    ? "Uploading..."
                    : "Change photo"}
                </Text>
              </TouchableOpacity>

              {avatarUrl && (
                <TouchableOpacity
                  onPress={
                    removeAvatar
                  }
                >
                  <Text
                    style={
                      styles.removePhoto
                    }
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.rightInfo}>
            <View
              style={
                styles.usernameRow
              }
            >
              <Text
                numberOfLines={1}
                style={
                  styles.username
                }
              >
                @
                {displayName?.replace(
                  /\s+/g,
                  ""
                ) || "username"}
              </Text>

              <TouchableOpacity
                onPress={
                  openUsernameEditor
                }
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

        {/* BIO */}
        <View style={styles.bioRow}>
          <Text style={styles.bio}>
            {bio ||
              "Add your bio"}
          </Text>

          <TouchableOpacity
            onPress={
              openBioEditor
            }
          >
            <Ionicons
              name="create-outline"
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* EDIT MODAL */}
      <Modal
        visible={
          editModalVisible
        }
        transparent
        animationType="fade"
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={styles.modalCard}
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              {editType ===
              "username"
                ? "Edit Username"
                : "Edit Bio"}
            </Text>

            <TextInput
              value={editValue}
              onChangeText={
                setEditValue
              }
              style={[
                styles.modalInput,
                editType ===
                  "bio" &&
                  styles.bioInput,
              ]}
              multiline={
                editType === "bio"
              }
              maxLength={
                editType === "bio"
                  ? 200
                  : 30
              }
              placeholder={
                editType ===
                "username"
                  ? "Enter username"
                  : "Tell users about yourself..."
              }
              placeholderTextColor="#9CA3AF"
            />

            <View
              style={
                styles.modalButtons
              }
            >
              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setEditModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.saveButton
                }
                onPress={saveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 22,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 18,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },

  bioInput: {
    height: 120,
    textAlignVertical: "top",
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 20,
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },

  cancelButtonText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 15,
  },

  saveButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#D97732",
  },

  saveButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
})