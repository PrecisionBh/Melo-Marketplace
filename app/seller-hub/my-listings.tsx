import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import ListingCard from "@/components/listing/ListingCard"
import ProStatusCard from "@/components/pro/ProStatusCard"
import UpgradeToProButton from "@/components/pro/UpgradeToProButton"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"

type Listing = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  status: "active" | "inactive"
  is_boosted?: boolean
  boost_expires_at?: string | null
}

type FilterType = "active" | "inactive"

export default function MyListingsScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [isPro, setIsPro] = useState(false)
  const [boostRemaining, setBoostRemaining] = useState(0)
  const [filter, setFilter] = useState<FilterType>("active")

  useEffect(() => {
    if (session?.user?.id) {
      initializeScreen()
    }
  }, [session?.user?.id])

  const initializeScreen = async () => {
    await Promise.all([loadListings(), loadProStatus()])
  }

  const loadProStatus = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro, boosts_remaining")
        .eq("id", session.user.id)
        .single()

      if (error) throw error

      setIsPro(!!data?.is_pro)
      setBoostRemaining(data?.boosts_remaining ?? 0)
    } catch (err) {
      handleAppError(err, {
        context: "my_listings_load_pro_status",
        silent: true,
      })
    }
  }

  const loadListings = async () => {
    if (!session?.user?.id) {
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
        .select(
          "id,title,price,image_urls,status,is_boosted,boost_expires_at"
        )
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

  const filteredListings = useMemo(() => {
    return listings.filter((l) => l.status === filter)
  }, [listings, filter])

  const boostListing = async (listingId: string) => {
    if (!session?.user?.id) {
      Alert.alert("Error", "User session not found.")
      return
    }

    if (!isPro) {
      Alert.alert(
        "Melo Pro Required",
        "Upgrade to Melo Pro to boost your listings."
      )
      return
    }

    if (boostRemaining <= 0) {
      Alert.alert(
        "No Boosts Remaining",
        "You’ve used all your boosts for this cycle."
      )
      return
    }

    try {
      const { error } = await supabase.rpc("boost_listing", {
        listing_id: listingId,
        user_id: session.user.id,
      })

      if (error) throw error

      await Promise.all([loadListings(), loadProStatus()])

      Alert.alert("Boosted 🚀", "Your listing is now boosted!")
    } catch (err) {
      handleAppError(err, {
        context: "boost_listing",
        fallbackMessage: "Failed to boost listing.",
      })
    }
  }

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

  const duplicateListing = async (id: string) => {
    try {
      const { data: oldListing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      if (!oldListing) throw new Error("Listing not found")

      const {
        id: _,
        created_at,
        updated_at,
        is_sold,
        status,
        is_boosted,
        boost_expires_at,
        ...rest
      } = oldListing

      const { error: insertError } = await supabase
        .from("listings")
        .insert({
          ...rest,
          status: "active",
          is_sold: false,
          is_boosted: false,
          boost_expires_at: null,
          created_at: new Date().toISOString(),
        })

      if (insertError) throw insertError

      Alert.alert("Success", "Listing reactivated.")
      loadListings()
    } catch (err) {
      handleAppError(err, {
        context: "my_listings_duplicate",
        fallbackMessage: "Could not reactivate listing.",
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
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#7FAF9B" />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="My Listings"
        backLabel="Seller Hub"
        backRoute="/seller-hub"
      />

      {/* PRO STATUS */}
      <View style={styles.topSection}>
        {!isPro ? (
          <UpgradeToProButton />
        ) : (
          <ProStatusCard boostsRemaining={boostRemaining} />
        )}
      </View>

      {/* ✨ ELEGANT MELO SEGMENTED TOGGLE */}
      <View style={styles.toggleOuter}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.segment,
              filter === "active" && styles.segmentActive,
            ]}
            onPress={() => setFilter("active")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                filter === "active" && styles.segmentTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              filter === "inactive" && styles.segmentActive,
            ]}
            onPress={() => setFilter("inactive")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                filter === "inactive" && styles.segmentTextActive,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredListings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No {filter} listings found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
          initialNumToRender={8}
          windowSize={5}
          removeClippedSubviews
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              isPro={isPro}
              boostRemaining={boostRemaining}
              onPress={() => router.push(`/listing/${item.id}`)}
              onEdit={() =>
                router.push({
                  pathname: "/edit-listing/[id]" as any,
                  params: { id: item.id },
                } as any)
              }
              onDelete={() => deleteListing(item.id)}
              onDeactivate={() => deactivateListing(item.id)}
              onDuplicate={() => duplicateListing(item.id)}
              onBoost={() => boostListing(item.id)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EAF4EF",
  },

  topSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },

  /* ✨ ELEGANT MELO TOGGLE */
  toggleOuter: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
  },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E3F2EC", // soft sage glass feel
    borderRadius: 999,
    padding: 4,
  },

  segment: {
    flex: 1,
    paddingVertical: 8, // slimmer height (elegant)
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentActive: {
    backgroundColor: "#7FAF9B",
    shadowColor: "#7FAF9B",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6F9C8A", // muted Melo green
    letterSpacing: 0.3,
  },

  segmentTextActive: {
    color: "#0F1E17", // dark forest for contrast
    fontWeight: "800",
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
})