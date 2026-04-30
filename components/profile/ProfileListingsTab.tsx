import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type Listing = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  status: "active" | "inactive"
  is_boosted?: boolean
  boost_expires_at?: string | null
  is_mega_boost?: boolean
  mega_boost_expires_at?: string | null
}

export default function ProfileListingsTab() {
  const router = useRouter()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [page, setPage] = useState(0)
const [loadingMore, setLoadingMore] = useState(false)
const PAGE_SIZE = 6

  useEffect(() => {
    if (session?.user?.id) {
      loadListings(0)
    } else {
      setLoading(false)
    }
  }, [session?.user?.id])

  const loadListings = async (pageOverride = 0) => {
  if (!session?.user?.id) return

  try {
    if (pageOverride === 0) setLoading(true)
    else setLoadingMore(true)

    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,price,image_urls,status,is_boosted,boost_expires_at,is_mega_boost,mega_boost_expires_at"
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(
        pageOverride * PAGE_SIZE,
        pageOverride * PAGE_SIZE + PAGE_SIZE - 1
      )

    if (error) throw error

    const newData = (data as Listing[]) ?? []

    if (pageOverride === 0) {
      setListings(newData)
    } else {
      setListings(prev => [...prev, ...newData])
    }

  } catch (err) {
    handleAppError(err, {
      context: "profile_listings_load",
      fallbackMessage: "Failed to load listings.",
    })
  } finally {
    setLoading(false)
    setLoadingMore(false)
  }
}

const loadMore = () => {
  const nextPage = page + 1
  setPage(nextPage)
  loadListings(nextPage)
}

  const visibleListings = useMemo(() => {
    return listings
  }, [listings])

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#7FAF9B" />
      </View>
    )
  }

  if (visibleListings.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons
          name="cube-outline"
          size={34}
          color="#9CA3AF"
          style={{ marginBottom: 10 }}
        />

        <Text style={styles.emptyTitle}>
          No listings yet
        </Text>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() =>
            router.push("/create-listing")
          }
        >
          <Ionicons
            name="add-circle-outline"
            size={16}
            color="#111827"
          />

          <Text style={styles.createBtnText}>
            Create Listing
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList

    ListFooterComponent={
  <TouchableOpacity
    onPress={loadMore}
    style={{
      marginTop: 10,
      marginBottom: 20,
      alignSelf: "center",
      backgroundColor: "#D97732",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    }}
  >
    {loadingMore ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={{ color: "#fff", fontWeight: "700" }}>
        Load More
      </Text>
    )}
  </TouchableOpacity>
}
      data={visibleListings}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false} // ✅ KEEP THIS (prevents nested scroll crash)
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
                      color="#9CA3AF"
                    />
                  </View>
                )}

                <View
                  style={[
                    styles.statusBadge,
                    item.status === "active"
                      ? styles.statusBadgeActive
                      : styles.statusBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.status === "active"
                        ? styles.statusBadgeTextActive
                        : styles.statusBadgeTextInactive,
                    ]}
                  >
                    {item.status === "active"
                      ? "Active"
                      : "Inactive"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.editBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/edit-listing/[id]" as any,
                      params: { id: item.id },
                    } as any)
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color="#111827"
                  />
                </TouchableOpacity>
              </View>

              <Text numberOfLines={1} style={styles.title}>
                {item.title}
              </Text>

              <Text style={styles.price}>
                ${Number(item.price ?? 0).toLocaleString()}
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
    paddingTop: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 34,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 14,
  },

  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },

  createBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  /* 🔥 MATCH TOP CARD PADDING */
  listContent: {
    marginTop: 16,
    paddingHorizontal: 16, // ← THIS matches your UI above
    paddingBottom: 10,
  },

  /* 🔥 CLEAN ROW SPACING */
  columnWrap: {
    justifyContent: "space-between",
    marginBottom: 14,
  },

  /* 🔥 FLEX GRID (NO % WIDTH ANYMORE) */
  card: {
    flex: 1,
    marginHorizontal: 4, // ← spacing BETWEEN cards
  },

  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
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

  statusBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    zIndex: 2,
  },

  statusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },

  statusBadgeInactive: {
    backgroundColor: "#E5E7EB",
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: "700",
  },

  statusBadgeTextActive: {
    color: "#166534",
  },

  statusBadgeTextInactive: {
    color: "#4B5563",
  },

  editBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  title: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
  },

  price: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
})