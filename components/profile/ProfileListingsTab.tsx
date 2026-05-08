import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import MyListingCard from "./my-listing"

type Listing = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  status: "active" | "inactive"
  views?: number
  favorites_count?: number
  created_at?: string
  is_boosted?: boolean
}

export default function ProfileListingsTab() {
  const router = useRouter()

  const { session } = useAuth()

  const [statusTab, setStatusTab] =
    useState<"active" | "inactive">(
      "active"
    )

  const [loading, setLoading] =
    useState(true)

  const [listings, setListings] =
    useState<Listing[]>([])

  const [page, setPage] = useState(0)

  const [loadingMore, setLoadingMore] =
    useState(false)

  const PAGE_SIZE = 10

  useEffect(() => {
    if (session?.user?.id) {
      setPage(0)

      loadListings(0, statusTab)
    } else {
      setLoading(false)
    }
  }, [session?.user?.id, statusTab])

  const loadListings = async (
    pageOverride = 0,
    tabOverride:
      | "active"
      | "inactive" = statusTab
  ) => {
    if (!session?.user?.id) return

    try {
      if (pageOverride === 0)
        setLoading(true)
      else setLoadingMore(true)

      const { data, error } =
        await supabase
          .from("listings")
          .select(
            `
            id,
            title,
            price,
            image_urls,
            status,
            views,
            favorites_count,
            created_at,
            is_boosted
          `
          )
          .eq("user_id", session.user.id)
          .eq("status", tabOverride)
          .order("created_at", {
            ascending: false,
          })
          .range(
            pageOverride * PAGE_SIZE,
            pageOverride * PAGE_SIZE +
              PAGE_SIZE -
              1
          )

      if (error) throw error

      const newData =
        (data as Listing[]) ?? []

      if (pageOverride === 0) {
        setListings(newData)
      } else {
        setListings((prev) => [
          ...prev,
          ...newData,
        ])
      }
    } catch (err) {
      handleAppError(err, {
        context:
          "profile_listings_load",
        fallbackMessage:
          "Failed to load listings.",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1

    setPage(nextPage)

    loadListings(nextPage, statusTab)
  }

  const switchTab = (
    tab: "active" | "inactive"
  ) => {
    if (tab === statusTab) return

    setStatusTab(tab)

    setPage(0)

    setListings([])
  }

  return (
    <View style={styles.wrapper}>
      {/* 🔥 ACTIVE / INACTIVE */}
      <View style={styles.topTabsWrap}>
        <TouchableOpacity
          style={[
            styles.topTab,
            statusTab === "active" &&
              styles.topTabActive,
          ]}
          onPress={() =>
            switchTab("active")
          }
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.topTabText,
              statusTab === "active" &&
                styles.topTabTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.topTab,
            statusTab === "inactive" &&
              styles.topTabActive,
          ]}
          onPress={() =>
            switchTab("inactive")
          }
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.topTabText,
              statusTab === "inactive" &&
                styles.topTabTextActive,
            ]}
          >
            Inactive
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color="#D97732"
          />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={
            styles.listContent
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 14 }} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="cube-outline"
                size={34}
                color="#9CA3AF"
                style={{
                  marginBottom: 10,
                }}
              />

              <Text style={styles.emptyTitle}>
                {statusTab === "active"
                  ? "No active listings"
                  : "No inactive listings"}
              </Text>

              <TouchableOpacity
                style={styles.createBtn}
                onPress={() =>
                  router.push(
                    "/create-listing"
                  )
                }
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color="#111827"
                />

                <Text
                  style={
                    styles.createBtnText
                  }
                >
                  Create Listing
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            listings.length > 0 ? (
              <TouchableOpacity
                onPress={loadMore}
                style={styles.loadMoreBtn}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={
                      styles.loadMoreText
                    }
                  >
                    Load More
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <MyListingCard
              listing={item}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },

  loadingWrap: {
    paddingTop: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  topTabsWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 18,
    backgroundColor: "#E5E7EB",
    borderRadius: 14,
    padding: 4,
  },

  topTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  topTabActive: {
    backgroundColor: "#D97732",
  },

  topTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  topTabTextActive: {
    color: "#fff",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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

  loadMoreBtn: {
    marginTop: 18,
    marginBottom: 30,
    alignSelf: "center",
    backgroundColor: "#D97732",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },

  loadMoreText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
})