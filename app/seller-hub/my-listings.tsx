import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AppHeader from "@/components/app-header";
import CreateListingFooter from "@/components/create-listing/CreateListingFooter";
import ListingCard from "@/components/listing/ListingCard";

import { useAuth } from "../../context/AuthContext";
import { handleAppError } from "../../lib/errors/appError";
import { supabase } from "../../lib/supabase";

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

type FilterType = "active" | "inactive"

export default function MyListingsScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [isPro, setIsPro] = useState(false)
  const [boostRemaining, setBoostRemaining] = useState(0)
  const [filter, setFilter] = useState<FilterType>("active")

  // footer state (kept for UI consistency)
  const [footerSubmitting, setFooterSubmitting] = useState(false)

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
        .select("id,title,price,image_urls,status,is_boosted,boost_expires_at,is_mega_boost,mega_boost_expires_at")
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

  const activeCount = useMemo(
    () => listings.filter((l) => l.status === "active").length,
    [listings]
  )
  const inactiveCount = useMemo(
    () => listings.filter((l) => l.status === "inactive").length,
    [listings]
  )
  const totalCount = listings.length

  const boostListing = async (listingId: string) => {
  if (!session?.user?.id) {
    Alert.alert("Error", "User session not found.")
    return
  }

  const listing = listings.find((l) => l.id === listingId)

  const now = new Date()

  const boostActive =
    listing?.is_boosted &&
    listing?.boost_expires_at &&
    new Date(listing.boost_expires_at) > now

  const megaActive =
    listing?.is_mega_boost &&
    listing?.boost_expires_at &&
    new Date(listing.boost_expires_at) > now

  // 🚫 BLOCK if ANY boost is active
  if (boostActive || megaActive) {
    Alert.alert(
      "Listing Already Boosted",
      "This listing already has an active boost. You can boost again once it expires."
    )
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

const megaBoostListing = async (listingId: string) => {
  if (!session?.user?.id) {
    Alert.alert("Error", "User session not found.")
    return
  }

  const listing = listings.find((l) => l.id === listingId)

  const now = new Date()

  const boostActive =
    listing?.is_boosted &&
    listing?.boost_expires_at &&
    new Date(listing.boost_expires_at) > now

  const megaActive =
    listing?.is_mega_boost &&
    listing?.boost_expires_at &&
    new Date(listing.boost_expires_at) > now

  if (boostActive || megaActive) {
    Alert.alert(
      "Listing Already Boosted",
      "This listing already has an active boost."
    )
    return
  }

  try {
    const { error } = await supabase.rpc("mega_boost_listing", {
      listing_id: listingId,
      user_id: session.user.id,
    })

    if (error) throw error

    await loadListings()

    Alert.alert("Mega Boosted 🚀", "Your listing is now mega boosted!")
  } catch (err) {
    handleAppError(err, {
      context: "mega_boost_listing",
      fallbackMessage: "Failed to mega boost listing.",
    })
  }
}

  const deactivateListing = async (id: string) => {
    try {
      // 🚀 OPTIMISTIC UI UPDATE (instant removal from Active tab)
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "inactive" } : l))
      )

      const { error } = await supabase
        .from("listings")
        .update({ status: "inactive" })
        .eq("id", id)

      if (error) throw error
    } catch (err) {
      handleAppError(err, {
        context: "my_listings_deactivate",
        fallbackMessage: "Failed to deactivate listing.",
      })
      loadListings()
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

      // 🚀 CRITICAL: instantly remove from inactive list (prevents duplicates)
      setListings((prev) => prev.filter((l) => l.id !== id))

      const { data: newListing, error: insertError } = await supabase
        .from("listings")
        .insert({
          ...rest,
          status: "active",
          is_sold: false,
          is_boosted: false,
          boost_expires_at: null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (newListing) {
        setListings((prev) => [newListing as Listing, ...prev])
      }

      Alert.alert("Success", "Listing reactivated.")
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
              // 🚀 OPTIMISTIC REMOVE (instant UI update)
              setListings((prev) => prev.filter((l) => l.id !== id))

              const { error } = await supabase.from("listings").delete().eq("id", id)

              if (error) throw error
            } catch (err) {
              handleAppError(err, {
                context: "my_listings_delete",
                fallbackMessage: "Failed to delete listing.",
              })
              loadListings()
            }
          },
        },
      ]
    )
  }

  const goCreateListing = async () => {
    if (footerSubmitting) return
    try {
      setFooterSubmitting(true)

      // ✅ Change this route if your create listing path differs
      router.push("/seller-hub/create-listing")
    } finally {
      // keep it snappy; navigation will usually happen instantly
      setTimeout(() => setFooterSubmitting(false), 350)
    }
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
      <AppHeader title="My Listings" backLabel="Seller Hub" backRoute="/seller-hub" />

      {/* Premium workspace header (universal; not selling Pro) */}
      <View style={styles.workspaceCard}>
        <View style={styles.workspaceTopRow}>
          <Text style={styles.workspaceTitle}>Inventory</Text>
          <Text style={styles.workspaceSub}>
            Manage, edit, pause, and relist your items.
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <Metric label="Active" value={String(activeCount)} />
          <View style={styles.metricDivider} />
          <Metric label="Inactive" value={String(inactiveCount)} />
          <View style={styles.metricDivider} />
          <Metric label="Total" value={String(totalCount)} />
        </View>
      </View>

      {/* Clean underline tabs */}
      <View style={styles.tabsWrap}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setFilter("active")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, filter === "active" && styles.tabTextActive]}>
            ACTIVE <Text style={styles.tabCount}>({activeCount})</Text>
          </Text>
          {filter === "active" && <View style={styles.tabUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setFilter("inactive")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, filter === "inactive" && styles.tabTextActive]}>
            INACTIVE <Text style={styles.tabCount}>({inactiveCount})</Text>
          </Text>
          {filter === "inactive" && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.body}>
        {filteredListings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              {filter === "active"
                ? "Your active listings will appear here."
                : "Listings you pause will appear here."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredListings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            initialNumToRender={8}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item }) => (
             <View style={styles.cardWrap}>
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
    onMegaBoost={() => megaBoostListing(item.id)}
  />
</View>
)}
/>
)}
</View>

      {/* ✅ STICKY CREATE LISTING FOOTER */}
      <View style={styles.stickyFooter}>
        <CreateListingFooter
          onSubmit={goCreateListing}
          submitting={footerSubmitting}
          disabled={false}
          label="Create Listing"
        />
      </View>
    </View>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9F8" },

  body: { flex: 1 },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
  },

  /* Workspace header */
  workspaceCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EFEA",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  workspaceTopRow: {
    marginBottom: 10,
  },
  workspaceTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 0.2,
  },
  workspaceSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#557566",
    opacity: 0.9,
    lineHeight: 16,
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F6F4",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(15,30,23,0.06)",
  },
  metric: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: "#557566",
    letterSpacing: 0.3,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(15,30,23,0.10)",
    marginHorizontal: 6,
  },

  /* Tabs */
  tabsWrap: {
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EFEA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B8F7D",
    letterSpacing: 1.1,
  },
  tabCount: {
    fontWeight: "900",
    color: "rgba(107,143,125,0.85)",
  },
  tabTextActive: {
    color: "#0F1E17",
  },
  tabUnderline: {
    marginTop: 8,
    height: 3,
    width: "42%",
    borderRadius: 99,
    backgroundColor: "#7FAF9B",
  },

  /* List */
  listContent: {
    padding: 16,
    paddingBottom: 220, // ✅ extra space so last card isn't hidden behind sticky footer
  },
  cardWrap: {
    marginBottom: 12,
  },

  /* Empty */
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#557566",
    textAlign: "center",
    lineHeight: 18,
  },

  /* Sticky Footer */
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
})