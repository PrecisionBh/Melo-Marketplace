import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"


type Listing = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  status: "active" | "inactive"
}

export default function MyListingsScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])

  useEffect(() => {
  if (session?.user?.id) {
    loadListings()
  }
}, [session?.user?.id])


  const loadListings = async () => {
  if (!session?.user) {
    handleAppError(new Error("Session missing"), {
      context: "my_listings_no_session",
      silent: true,
    })
    return
  }

  try {
    setLoading(true)

    const { data, error } = await supabase
      .from("listings")
      .select("id,title,price,image_urls,status")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    setListings(data ?? [])
  } catch (err) {
    handleAppError(err, {
      context: "my_listings_load",
      fallbackMessage: "Failed to load listings.",
    })
  } finally {
    setLoading(false)
  }
}


  /* ---------------- DEACTIVATE ---------------- */

  const deactivateListing = async (id: string) => {
  try {
    const { error } = await supabase
      .from("listings")
      .update({ status: "inactive" })
      .eq("id", id)

    if (error) throw error

    loadListings()
  } catch (err) {
    handleAppError(err, {
      context: "my_listings_deactivate",
      fallbackMessage: "Failed to deactivate listing.",
    })
  }
}


  /* ---------------- DUPLICATE ---------------- */

  const duplicateListing = async (id: string) => {
  try {
    const { data: oldListing, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    if (!oldListing) {
      throw new Error("Listing not found for duplication")
    }

    const {
      id: _,
      created_at,
      updated_at,
      is_sold,
      status,
      ...rest
    } = oldListing

    const { error: insertError } = await supabase
      .from("listings")
      .insert({
        ...rest,
        status: "active",
        is_sold: false,
        created_at: new Date().toISOString(),
      })

    if (insertError) throw insertError

    Alert.alert("Success", "Listing duplicated.")
    loadListings()
  } catch (err) {
    handleAppError(err, {
      context: "my_listings_duplicate",
      fallbackMessage: "Could not duplicate listing.",
    })
  }
}


  const deleteListing = (id: string) => {
    Alert.alert(
      "Delete listing",
      "Are you sure you want to permanently delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
  try {
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id)

    if (error) throw error

    loadListings()
  } catch (err) {
    handleAppError(err, {
      context: "my_listings_delete",
      fallbackMessage: "Failed to delete listing.",
    })
  }
},

        },
      ]
    )
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="My Listings"
        backLabel="Seller Hub"
        backRoute="/seller-hub"
      />

      {listings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            You don’t have any listings yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 140 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={{ flexDirection: "row", gap: 12 }}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                <Image
                  source={{
                    uri:
                      item.image_urls?.[0] ??
                      "https://via.placeholder.com/150",
                  }}
                  style={styles.image}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.price}>
                    ${item.price.toFixed(2)}
                  </Text>

                  {item.status === "active" && (
                    <Text style={styles.activeText}>Active</Text>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                {item.status === "active" ? (
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => deactivateListing(item.id)}
                  >
                    <Text style={styles.smallBtnText}>
                      Deactivate
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => duplicateListing(item.id)}
                  >
                    <Text style={styles.smallBtnText}>
                      Duplicate
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.smallBtn, styles.deleteBtn]}
                  onPress={() => deleteListing(item.id)}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() =>
                  router.push({
                    pathname: "/edit-listing/[id]" as any,
                    params: { id: item.id },
                  } as any)
                }
              >
                <Text style={styles.editText}>EDIT</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  /* (Old header styles kept for safety during refactor) */
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B8F7D",
  },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#D6E6DE",
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  price: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  activeText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#27AE60",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  smallBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
  },

  smallBtnText: {
    fontWeight: "800",
    color: "#0F1E17",
  },

  deleteBtn: {
    backgroundColor: "#FCEAEA",
  },

  deleteText: {
    fontWeight: "800",
    color: "#C0392B",
  },

  editBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  editText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 1,
  },
})
