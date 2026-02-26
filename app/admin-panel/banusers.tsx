import AppHeader from "@/components/app-header"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { useState } from "react"
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

type Profile = {
  id: string
  email: string
  display_name: string | null
  is_banned: boolean
  ban_reason: string | null
}

export default function BanUsersScreen() {
  const [searchEmail, setSearchEmail] = useState("")
  const [banReason, setBanReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<Profile | null>(null)

  const normalizedEmail = searchEmail.trim().toLowerCase()

  const handleSearch = async () => {
    if (!normalizedEmail) {
      Alert.alert("Enter Email", "Please enter an email to search.")
      return
    }

    try {
      setLoading(true)
      setUser(null)
      setBanReason("")

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, is_banned, ban_reason")
        .ilike("email", normalizedEmail)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        Alert.alert("User Not Found", "No account found with that email.")
        return
      }

      setUser(data)
      setBanReason(data.ban_reason ?? "")
    } catch (err) {
      handleAppError(err, {
        context: "admin_search_user",
        fallbackMessage: "Failed to search user.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBanToggle = async () => {
    if (!user) return

    const banning = !user.is_banned

    if (banning && !banReason.trim()) {
      Alert.alert(
        "Ban Reason Required",
        "Please enter a ban reason before banning this user."
      )
      return
    }

    const actionText = banning ? "Ban" : "Unban"

    Alert.alert(
      `${actionText} User`,
      `Are you sure you want to ${actionText.toLowerCase()} this account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionText,
          style: banning ? "destructive" : "default",
          onPress: async () => {
            try {
              setLoading(true)

              const { error } = await supabase
                .from("profiles")
                .update({
                  is_banned: banning,
                  ban_reason: banning ? banReason.trim() : null,
                })
                .eq("id", user.id)

              if (error) {
                console.error("BAN UPDATE ERROR:", error)
                throw error
              }

              setUser({
                ...user,
                is_banned: banning,
                ban_reason: banning ? banReason.trim() : null,
              })

              Alert.alert(
                "Success",
                banning
                  ? "User has been banned successfully."
                  : "User has been unbanned successfully."
              )
            } catch (err) {
              handleAppError(err, {
                context: "admin_toggle_ban",
                fallbackMessage:
                  "Failed to update ban status. Check RLS policies.",
              })
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Ban / Unban Users" />

      <View style={styles.content}>
        <Text style={styles.label}>Search User by Email</Text>

        <TextInput
          placeholder="Enter user email..."
          placeholderTextColor="#8FA39B"
          value={searchEmail}
          onChangeText={setSearchEmail}
          autoCapitalize="none"
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.searchButtonText}>Search User</Text>
          )}
        </TouchableOpacity>

        {user && (
          <View style={styles.userCard}>
            <Text style={styles.userTitle}>User Found</Text>

            <Text style={styles.userField}>
              <Text style={styles.fieldLabel}>Email: </Text>
              {user.email}
            </Text>

            <Text style={styles.userField}>
              <Text style={styles.fieldLabel}>Name: </Text>
              {user.display_name || "No display name"}
            </Text>

            <View style={styles.statusRow}>
              <Text style={styles.fieldLabel}>Status: </Text>
              <Text
                style={[
                  styles.statusText,
                  user.is_banned
                    ? styles.bannedText
                    : styles.activeText,
                ]}
              >
                {user.is_banned ? "BANNED" : "ACTIVE"}
              </Text>
            </View>

            {/* BAN REASON BOX */}
            <Text style={styles.label}>Ban Reason</Text>
            <TextInput
              placeholder="Enter reason for ban (required when banning)"
              placeholderTextColor="#8FA39B"
              value={banReason}
              onChangeText={setBanReason}
              style={[styles.input, { height: 80 }]}
              multiline
            />

            {user.is_banned && user.ban_reason && (
              <Text style={styles.currentReason}>
                Current Reason: {user.ban_reason}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.banButton,
                user.is_banned
                  ? styles.unbanButton
                  : styles.banRedButton,
              ]}
              onPress={handleBanToggle}
              disabled={loading}
            >
              <Text style={styles.banButtonText}>
                {user.is_banned ? "Unban User" : "Ban User"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const MELO_GREEN = "#7FAF9B"

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20 },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    color: "#1A2B24",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D6E3DD",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: "#0F1E17",
    textAlignVertical: "top",
  },
  searchButton: {
    backgroundColor: MELO_GREEN,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  userCard: {
    backgroundColor: "#F4F8F6",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },
  userTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    color: "#1A2B24",
  },
  userField: { fontSize: 15, marginBottom: 6, color: "#1A2B24" },
  fieldLabel: { fontWeight: "700" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  statusText: { fontSize: 15, fontWeight: "800" },
  activeText: { color: "#1F9D6A" },
  bannedText: { color: "#D64545" },
  currentReason: {
    color: "#D64545",
    fontWeight: "600",
    marginBottom: 12,
  },
  banButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  banRedButton: { backgroundColor: "#D64545" },
  unbanButton: { backgroundColor: "#2E7D32" },
  banButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
})