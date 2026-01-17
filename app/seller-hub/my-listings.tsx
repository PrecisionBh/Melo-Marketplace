import { Ionicons } from "@expo/vector-icons"
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

import { useAuth } from "../../context/AuthContext"
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
    loadListings()
  }, [])

  const loadListings = async () => {
    if (!session?.user) return

    setLoading(true)

    const { data } = await supabase
      .from("listings")
      .select("id,title,price,image_urls,status")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    setListings(data ?? [])
    setLoading(false)
  }

  const toggleListingStatus = async (
    id: string,
    current: "active" | "inactive"
  ) => {
    const next = current === "active" ? "inactive" : "active"

    await supabase
      .from("listings")
      .update({ status: next })
      .eq("id", id)

    loadListings()
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
            await supabase.from("listings").delete().eq("id", id)
            loadListings()
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
      {/* 🌿 SAGE GREEN HEADER */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>My Listings</Text>

          <View style={{ width: 22 }} />
        </View>
      </View>

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
            <TouchableOpacity
              style={styles.card}
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

                {/* ACTION ROW */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() =>
                      toggleListingStatus(item.id, item.status)
                    }
                  >
                    <Text style={styles.smallBtnText}>
                      {item.status === "active"
                        ? "De-List"
                        : "Re-List"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallBtn, styles.deleteBtn]}
                    onPress={() => deleteListing(item.id)}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* BIG EDIT BUTTON */}
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
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

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
    color: "#0F1E17",
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
    flexDirection: "row",
    gap: 12,
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
