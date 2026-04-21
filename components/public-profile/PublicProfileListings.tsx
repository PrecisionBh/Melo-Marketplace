import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { supabase } from "@/lib/supabase"

type Props = {
  userId: string
}

type Listing = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  status: "active" | "inactive"
}

export default function PublicProfileListings({ userId }: Props) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])

  useEffect(() => {
    if (userId) {
      loadListings()
    }
  }, [userId])

  const loadListings = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,image_urls,status")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) throw error

      setListings((data as Listing[]) ?? [])
    } catch (err) {
      console.log("Listings error:", err)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
      </View>
    )
  }

  if (listings.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          No active listings
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={listings}
      keyExtractor={(item) => item.id}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={styles.columnWrap}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const image = item.image_urls?.[0] ?? null

        return (
          <View style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                router.push(`/listing/${item.id}`)
              }
            >
              <View style={styles.imageWrap}>
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color="#D1D5DB"
                    />
                  </View>
                )}
              </View>

              <Text numberOfLines={1} style={styles.title}>
                {item.title}
              </Text>

              <Text style={styles.price}>
                ${Number(item.price).toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    marginTop: 20,
    alignItems: "center",
  },

  emptyWrap: {
    marginTop: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#0F1E17",
    opacity: 0.5,
    fontSize: 13,
  },

  listContent: {
    marginTop: 16,
    paddingHorizontal: 16,
  },

  columnWrap: {
    justifyContent: "space-between",
    marginBottom: 16,
  },

  card: {
    width: "48%",
  },

  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F1E17",
  },

  price: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },
})