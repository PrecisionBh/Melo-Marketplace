import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function AdminDashboard() {
  const router = useRouter()
  const { session } = useAuth()

  const userId = session?.user?.id ?? null

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setLoading(false)
        return
      }

      const checkAdmin = async () => {
        try {
          setLoading(true)

          const { data, error } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", userId) // if your column is user_id, change to .eq("user_id", userId)
            .single()

          if (error) throw error

          setIsAdmin(data?.is_admin === true)
        } catch (err) {
          handleAppError(err, {
            context: "admin_check",
            fallbackMessage: "Failed to verify admin access",
          })
        } finally {
          setLoading(false)
        }
      }

      checkAdmin()
    }, [userId])
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading Admin Panel...</Text>
      </View>
    )
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedSub}>
          You do not have permission to access the admin panel.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Admin Panel" />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Admin Tools</Text>

        {/* Order Search */}
        <TouchableOpacity
          style={styles.pill}
          onPress={() => router.push("/admin-panel/orders")}
        >
          <Text style={styles.pillText}>🔎 Search Orders (UUID)</Text>
        </TouchableOpacity>

        {/* Problem Orders */}
        <TouchableOpacity
          style={styles.pill}
          onPress={() => router.push("/admin-panel/problem-orders")}
        >
          <Text style={styles.pillText}>
            ⚠️ Problem Orders (Returns / Disputes)
          </Text>
        </TouchableOpacity>

        {/* Delete Listings */}
        <TouchableOpacity
          style={styles.pill}
          onPress={() => router.push("/admin-panel/listings")}
        >
          <Text style={styles.pillText}>🗑️ Delete Listings</Text>
        </TouchableOpacity>

        {/* Ban Users */}
        <TouchableOpacity
          style={styles.pill}
          onPress={() => router.push("/admin-panel/banusers")}
        >
          <Text style={styles.pillText}>🚫 Ban Users (By Email)</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  pill: {
    backgroundColor: "#7FAF9B", // Melo theme green
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    elevation: 2,
  },
  pillText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  deniedTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  deniedSub: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
})