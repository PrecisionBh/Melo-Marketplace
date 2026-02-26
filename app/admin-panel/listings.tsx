import { useState } from "react"
import {
    ActivityIndicator,
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
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type Listing = {
  id: string
  title: string
  description: string | null
  price: number
  category: string | null
  image_urls: string[] | null
  user_id: string
  is_removed: boolean
  is_sold: boolean
  created_at: string
}

export default function AdminListingsScreen() {
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [removeReason, setRemoveReason] = useState("")

  const normalizedSearch = search.trim().toLowerCase()

  const handleSearch = async () => {
    if (!normalizedSearch) {
      Alert.alert("Search Required", "Enter a listing title to search.")
      return
    }

    try {
      setLoading(true)
      setListings([])

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .ilike("title", `%${normalizedSearch}%`)
        .order("created_at", { ascending: false })
        .limit(25)

      if (error) throw error

      setListings(data || [])
    } catch (err) {
      handleAppError(err, {
        context: "admin_search_listings",
        fallbackMessage: "Failed to search listings.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSoftDelete = async (listing: Listing) => {
    Alert.alert(
      "Remove Listing",
      "This will hide the listing from the marketplace. It will NOT be permanently deleted (safe for disputes & orders).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true)

              const { error } = await supabase
                .from("listings")
                .update({
                  is_removed: true,
                })
                .eq("id", listing.id)

              if (error) throw error

              setListings((prev) =>
                prev.map((l) =>
                  l.id === listing.id
                    ? { ...l, is_removed: true }
                    : l
                )
              )

              Alert.alert(
                "Listing Removed",
                "The listing has been hidden from the marketplace."
              )
            } catch (err) {
              handleAppError(err, {
                context: "admin_remove_listing",
                fallbackMessage: "Failed to remove listing.",
              })
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleRestore = async (listing: Listing) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from("listings")
        .update({
          is_removed: false,
        })
        .eq("id", listing.id)

      if (error) throw error

      setListings((prev) =>
        prev.map((l) =>
          l.id === listing.id ? { ...l, is_removed: false } : l
        )
      )

      Alert.alert("Restored", "Listing has been restored.")
    } catch (err) {
      handleAppError(err, {
        context: "admin_restore_listing",
        fallbackMessage: "Failed to restore listing.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Admin • Listings Moderation" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Search Listings by Title</Text>

        <TextInput
          placeholder="e.g. Custom Cue, Predator, Jersey..."
          placeholderTextColor="#8FA39B"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.searchButtonText}>
              Search Listings
            </Text>
          )}
        </TouchableOpacity>

        {listings.map((listing) => (
          <View key={listing.id} style={styles.card}>
            {listing.image_urls?.[0] && (
              <Image
                source={{ uri: listing.image_urls[0] }}
                style={styles.image}
              />
            )}

            <Text style={styles.title}>{listing.title}</Text>

            <Text style={styles.price}>
              ${Number(listing.price).toFixed(2)}
            </Text>

            <Text style={styles.meta}>
              Category: {listing.category || "N/A"}
            </Text>

            <Text style={styles.meta}>
              Seller ID: {listing.user_id}
            </Text>

            <Text style={styles.meta}>
              Status:{" "}
              <Text
                style={{
                  color: listing.is_removed
                    ? "#D64545"
                    : "#1F9D6A",
                  fontWeight: "800",
                }}
              >
                {listing.is_removed ? "REMOVED" : "ACTIVE"}
              </Text>
            </Text>

            <Text style={styles.description}>
              {listing.description || "No description provided"}
            </Text>

            <View style={styles.buttonRow}>
              {!listing.is_removed ? (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleSoftDelete(listing)}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    Soft Delete (Hide)
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={() => handleRestore(listing)}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    Restore Listing
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const MELO_GREEN = "#7FAF9B"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
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
  card: {
    backgroundColor: "#F4F8F6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    color: "#1A2B24",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F9D6A",
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: "#4B5E57",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#333",
    marginTop: 6,
  },
  buttonRow: {
    marginTop: 14,
  },
  removeButton: {
    backgroundColor: "#D64545",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  restoreButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
})