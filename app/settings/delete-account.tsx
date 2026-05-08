import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { supabase } from "@/lib/supabase"

import { useRouter } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL

export default function DeleteAccountScreen() {
  const router = useRouter()

  const [visible, setVisible] =
    useState(false)
  const [loading, setLoading] =
    useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)

      const { data } =
        await supabase.auth.getUser()

      const userId =
        data?.user?.id

      if (!userId)
        throw new Error("No user found")

      await fetch(
        `${SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      )

      await supabase.auth.signOut()

      router.replace("/login")
    } catch (err) {
      console.error(
        "Delete account error:",
        err
      )
    } finally {
      setLoading(false)
      setVisible(false)
    }
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageTitle}>
          Delete Account
        </Text>

        <View style={styles.card}>
          <Text style={styles.title}>
            Delete Your Account
          </Text>

          <Text style={styles.description}>
            Deleting your account will
            permanently remove your
            profile, listings, messages,
            wallet data, and all
            associated activity.
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warning}>
              This action cannot be
              undone.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            setVisible(true)
          }
        >
          <Text style={styles.deleteText}>
            Delete My Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text
              style={styles.modalTitle}
            >
              Final Confirmation
            </Text>

            <Text
              style={styles.modalText}
            >
              Are you absolutely sure
              you want to delete your
              account? This action
              cannot be reversed.
            </Text>

            <View
              style={styles.actions}
            >
              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setVisible(false)
                }
                disabled={loading}
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.confirmDelete
                }
                onPress={
                  handleDelete
                }
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={
                      styles.confirmText
                    }
                  >
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 18,
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },

  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 21,
    marginBottom: 16,
  },

  warningBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  warning: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },

  deleteButton: {
    backgroundColor: "#DC2626",
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  overlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 21,
    marginBottom: 20,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  cancelText: {
    fontWeight: "700",
    color: "#111",
  },

  confirmDelete: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "800",
  },
})