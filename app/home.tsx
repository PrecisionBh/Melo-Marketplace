import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import FilterBar from "../components/home/FilterBar"
import ListingsGrid from "../components/home/ListingsGrid"
import SearchBar from "../components/home/SearchBar"

import { Listing } from "../components/home/ListingCard"
import { useAuth } from "../context/AuthContext"
import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

/* ---------------- CATEGORY MAPS ---------------- */

const CUE_CATEGORIES = [
  "custom_cue",
  "playing_cue",
  "break_cue",
  "jump_cue",
]

const CASE_CATEGORIES = [
  "case",
  "hard_case",
  "soft_case",
]

/* ---------------- DB ROW TYPE ---------------- */

type ListingRow = {
  id: string
  title: string
  price: number
  category: string
  image_urls: string[] | null
  shipping_type?: "seller_pays" | "buyer_pays" | null
  user_id?: string
  is_boosted?: boolean | null
  is_mega_boost?: boolean | null
  created_at?: string
}

/* ---------------- SCREEN ---------------- */

export default function HomeScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const [listings, setListings] = useState<Listing[]>([])
  const [allListings, setAllListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)

  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [minPrice, setMinPrice] = useState("")
const [maxPrice, setMaxPrice] = useState("")

const [draftMinPrice, setDraftMinPrice] = useState("")
const [draftMaxPrice, setDraftMaxPrice] = useState("")


 const [activeCategory, setActiveCategory] =
  useState<any>("all")

  const [hasUnreadMessages, setHasUnreadMessages] =
    useState(false)

  const [hasUnreadNotifications, setHasUnreadNotifications] =
    useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [megaBoostListings, setMegaBoostListings] = useState<Listing[]>([])
  const [page, setPage] = useState(0)
const PAGE_SIZE = 25
const [hasMore, setHasMore] = useState(true)
const [loadingMore, setLoadingMore] = useState(false)

useEffect(() => {
  const threshold = 1000

  if (scrollOffset > threshold && hasMore && !loadingMore) {
    loadMoreListings()
  }
}, [scrollOffset, hasMore])

  const requireAuth = (action?: () => void) => {
    if (!session?.user) {
      setShowAuthModal(true)
      return
    }

    action?.()
  }

  /* ---------------- CATEGORY OPTIONS BY SPORT ---------------- */

  const categoryOptions = useMemo(() => {
  return [
    { key: "all" as any, label: "All" },
    { key: "electronics" as any, label: "Electronics" },
    { key: "fashion" as any, label: "Clothing" },
    { key: "home_garden" as any, label: "Home" },
    { key: "sports_outdoors" as any, label: "Sports" },
    { key: "collectibles" as any, label: "Collectibles" },
    { key: "automotive" as any, label: "Automotive" },
    { key: "other" as any, label: "Other" },
  ]
}, [])

  /* ---------------- LOAD DATA ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (listings.length === 0) {
        loadListings()
      }

      checkUnreadMessages()
      checkUnreadNotifications()
    }, [listings.length])
  )

  useEffect(() => {
  if (page === 0) return

  const fetchMore = async () => {
    await loadListings()
    setLoadingMore(false)
  }

  fetchMore()
}, [page])

  const loadListings = async () => {
    if (listings.length === 0) {
      setLoading(true)
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let followedSellerIds: string[] = []

      if (user) {
        const { data: followsData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)

        followedSellerIds =
          followsData?.map((f: any) => f.following_id) ?? []

        const { data: proData, error: proErr } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", user.id)
          .maybeSingle()

        if (proErr) {
          console.log("[HOME] is_pro fetch error:", proErr.message)
        }

        setIsPro(proData?.is_pro === true)
      } else {
        setIsPro(false)
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,price,category,image_urls,shipping_type,user_id,is_boosted,is_mega_boost,created_at"
        )
        .eq("status", "active")
        .eq("is_sold", false)
        .eq("is_removed", false)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (error) throw error

      const rows = (data ?? []) as ListingRow[]
      const newAllListings = Array.from(
  new Map(
    [...allListings, ...rows].map(item => [item.id, item])
  ).values()
)

setAllListings(newAllListings)
      if ((rows ?? []).length < PAGE_SIZE) {
  setHasMore(false)
} else {
  setHasMore(true)
}

      const validRows = newAllListings.filter(
        (l) =>
          Array.isArray(l.image_urls) &&
          l.image_urls.length > 0 &&
          l.title?.trim().length > 0 &&
          Number(l.price) > 0
      )

      const activeMegaBoostRows = validRows.filter(
        (l) => l.is_mega_boost === true
      )

      const boostedRows = validRows.filter(
        (l) => l.is_boosted === true
      )

      const nonBoostedRows = validRows.filter(
        (l) => !l.is_boosted
      )

      const followedRows = nonBoostedRows.filter((l) =>
        followedSellerIds.includes(l.user_id ?? "")
      )

      const newRows = nonBoostedRows.filter(
        (l) => !followedSellerIds.includes(l.user_id ?? "")
      )

      const merged: ListingRow[] = []

      let bIndex = 0
      let fIndex = 0
      let nIndex = 0

      while (
        bIndex < boostedRows.length ||
        fIndex < followedRows.length ||
        nIndex < newRows.length
      ) {
        for (let i = 0; i < 3; i++) {
          if (bIndex < boostedRows.length) {
            merged.push(boostedRows[bIndex++])
          } else if (fIndex < followedRows.length) {
            merged.push(followedRows[fIndex++])
          } else if (nIndex < newRows.length) {
            merged.push(newRows[nIndex++])
          }
        }

        for (let i = 0; i < 3; i++) {
          if (fIndex < followedRows.length) {
            merged.push(followedRows[fIndex++])
          } else if (nIndex < newRows.length) {
            merged.push(newRows[nIndex++])
          } else if (bIndex < boostedRows.length) {
            merged.push(boostedRows[bIndex++])
          }
        }

        for (let i = 0; i < 3; i++) {
          if (nIndex < newRows.length) {
            merged.push(newRows[nIndex++])
          } else if (fIndex < followedRows.length) {
            merged.push(followedRows[fIndex++])
          } else if (bIndex < boostedRows.length) {
            merged.push(boostedRows[bIndex++])
          }
        }

        if (
          bIndex >= boostedRows.length &&
          fIndex >= followedRows.length &&
          nIndex >= newRows.length
        ) {
          break
        }
      }

      const normalized: Listing[] = merged.map((l) => ({
        id: l.id,
        title: l.title,
        price: Number(l.price),
        category: l.category ?? "",
        image_url: l.image_urls?.[0] ?? null,
        allow_offers: false,
        shipping_type: l.shipping_type ?? null,
      }))

      const uniqueListings = Array.from(
        new Map(normalized.map((item) => [item.id, item])).values()
      )
       
      setListings(prev => {
  const merged = [...prev, ...uniqueListings]

  return Array.from(
    new Map(merged.map(item => [item.id, item])).values()
  )
})

      const normalizedMegaBoosts: Listing[] =
        activeMegaBoostRows.map((l) => ({
          id: l.id,
          title: l.title,
          price: Number(l.price),
          category: l.category ?? "",
          image_url: l.image_urls?.[0] ?? null,
          allow_offers: false,
          shipping_type: l.shipping_type ?? null,
        }))

      setMegaBoostListings(prev => {
  const merged = [...prev, ...normalizedMegaBoosts]

  return Array.from(
    new Map(merged.map(item => [item.id, item])).values()
  )
})
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load listings. Please refresh and try again.",
      })
    } finally {
      setLoading(false)
    }
  }
const loadMoreListings = async () => {
  if (loadingMore || !hasMore) return

  setLoadingMore(true)
  setPage(prev => prev + 1)
}

  const refreshListings = async () => {
  setRefreshing(true)
  setPage(0)
  setHasMore(true)
  setAllListings([])
  await loadListings()
  setRefreshing(false)
}

const checkUnreadMessages = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setHasUnreadMessages(false)
      return
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id")
      .neq("sender_id", user.id) // 🔥 not your messages
      .is("read_at", null)       // 🔥 unread
      .limit(1)

    if (error) throw error

    setHasUnreadMessages((data ?? []).length > 0)
  } catch (err) {
    handleAppError(err, {
      context: "check_unread_messages",
    })
    setHasUnreadMessages(false)
  }
}  


  const checkUnreadNotifications = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setHasUnreadNotifications(false)
      return
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .or("cleared.is.null,cleared.eq.false")

    if (error) throw error

    setHasUnreadNotifications((count ?? 0) > 0)
  } catch (err) {
    handleAppError(err, {
      context: "check_unread_notifications",
    })
    setHasUnreadNotifications(false)
  }
}

  /* ---------------- FILTERING (FIXED & STABLE) ---------------- */

  const filteredListings = useMemo(() => {
  let result = [...listings]

  if (search.trim()) {
    const q = search.toLowerCase().trim()

    result = result.filter((l) => {
      const title = (l.title ?? "").toLowerCase()
      const category = (l.category ?? "").toLowerCase()

      return title.includes(q) || category.includes(q)
    })
  }

  if (minPrice.trim()) {
    const min = parseFloat(minPrice)

    if (!isNaN(min)) {
      result = result.filter(
        (l) => Number(l.price) >= min
      )
    }
  }

  if (maxPrice.trim()) {
    const max = parseFloat(maxPrice)

    if (!isNaN(max)) {
      result = result.filter(
        (l) => Number(l.price) <= max
      )
    }
  }

  if (activeCategory !== "all") {
    const active = (activeCategory ?? "").toLowerCase()

    result = result.filter((l) => {
      const cat = (l.category ?? "").toLowerCase()
      return cat === active
    })
  }

  return result
}, [
  listings,
  activeCategory,
  search,
  minPrice,
  maxPrice,
])

const hasActiveFilters =
  search.trim().length > 0 ||
  activeCategory !== "all" ||
  minPrice.trim().length > 0 ||
  maxPrice.trim().length > 0

const hasResults = filteredListings.length > 0

/* ---------------- RENDER ---------------- */
  return (
    <>
      <View style={styles.screen}>
        <View style={styles.headerBlock}>
  <GlobalHeader
    notifCount={hasUnreadNotifications ? 1 : 0}
    onNotificationsPress={() =>
      requireAuth(() => router.push("/notifications"))
    }
    onMessagesPress={() =>
      requireAuth(() => router.push("/messages"))
    }
  />

 <SearchBar
  value={search}
  onChange={setSearch}
  placeholder="Search marketplace..."
  showFilters={showFilters}
  onToggleFilters={() => setShowFilters(!showFilters)}
  minPrice={draftMinPrice}
  maxPrice={draftMaxPrice}
  setMinPrice={setDraftMinPrice}
  setMaxPrice={setDraftMaxPrice}
  onClearFilters={() => {
    setDraftMinPrice("")
    setDraftMaxPrice("")
    setMinPrice("")
    setMaxPrice("")
  }}
  onApplyFilters={() => {
    setMinPrice(draftMinPrice)
    setMaxPrice(draftMaxPrice)
    setShowFilters(false)
  }}
/>

  <FilterBar
  active={activeCategory as any}
  onChange={(key) => setActiveCategory(key)}
  options={categoryOptions as any}
/>
</View>

{loading ? (
  <ActivityIndicator style={{ marginTop: 40 }} />
) : (
  <>
    {hasActiveFilters && filteredListings.length === 0 && (
      <View style={styles.noResultsWrap}>
        <Text style={styles.noResultsTitle}>
          {activeCategory !== "all" &&
          !search.trim() &&
          !minPrice.trim() &&
          !maxPrice.trim()
            ? "No items yet in this category"
            : "No items match your filters"}
        </Text>

        <Text style={styles.noResultsSub}>
          {activeCategory !== "all" &&
          !search.trim() &&
          !minPrice.trim() &&
          !maxPrice.trim()
            ? "Be the first to post!"
            : "Showing sponsored listings instead"}
        </Text>
      </View>
    )}

    <ListingsGrid
      listings={filteredListings}
      refreshing={refreshing}
      onRefresh={refreshListings}
      showUpgradeRow={!isPro}
      megaBoostListings={megaBoostListings}
      onScrollOffsetChange={setScrollOffset}
    />
    {loadingMore && (
  <ActivityIndicator style={{ marginVertical: 20 }} />
)}
  </>
)}

      </View>
      <GlobalFooter />
      {menuOpen && (
        <View style={styles.menuOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />

          <View style={styles.menuDropdown}>
            <MenuItem
              icon="albums-outline"
              label="Buyer Hub"
              onPress={() => {
                setMenuOpen(false)
                requireAuth(() => router.push("/buyer-hub"))
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="heart-outline"
              label="My Likes"
              onPress={() => {
                setMenuOpen(false)
                requireAuth(() => router.push("/watching"))
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="briefcase-outline"
              label="Seller Hub"
              onPress={() => {
                setMenuOpen(false)
                requireAuth(() => router.push("/seller-hub"))
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="wallet-outline"
              label="Wallet"
              onPress={() => {
                setMenuOpen(false)
                requireAuth(() => router.push("/seller-hub/wallet"))
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="create-outline"
              label="Edit Profile"
              onPress={() => {
                setMenuOpen(false)
                requireAuth(() => router.push("/settings/edit-profile"))
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="settings-outline"
              label="Settings"
              onPress={() => {
                setMenuOpen(false)
                requireAuth(() => router.push("/settings"))
              }}
            />
          </View>
        </View>
      )}

      {showAuthModal && (
  <View style={styles.authOverlay}>
    <View style={styles.authModal}>
      <Text style={styles.authTitle}>
        Sign in to continue
      </Text>

      <TouchableOpacity
        style={styles.authBtn}
        onPress={() => {
          setShowAuthModal(false)
          router.push("/signinscreen")
        }}
      >
        <Text style={styles.authBtnText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.authBtnOutline}
        onPress={() => {
          setShowAuthModal(false)
          router.push("/register")
        }}
      >
        <Text style={styles.authBtnOutlineText}>
          Create Account
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowAuthModal(false)}>
        <Text style={styles.authCancel}>Not now</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
    </>
  )
}

/* ---------------- MENU COMPONENTS ---------------- */

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: any
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.menuItemRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color="#0F1E17" />
      <Text style={styles.menuItemText}>{label}</Text>
    </TouchableOpacity>
  )
}

function MenuDivider() {
  return <View style={styles.menuDivider} />
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
 screen: {
  flex: 1,
  backgroundColor: "#F8F8F8",
  paddingBottom: 90,
},

headerBlock: {
  backgroundColor: "#F8F8F8",
  paddingBottom: 10,
},
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  menuDropdown: {
    position: "absolute",
    top: 95,
    left: 16,
    width: 230,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 24,
    borderWidth: 1,
    borderColor: "#E6EFEA",
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1E17",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#EEF3F0",
    marginHorizontal: 12,
  },

  authOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
},

authModal: {
  width: "85%",
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 20,
  alignItems: "center",
},

authTitle: {
  fontSize: 18,
  fontWeight: "800",
  marginBottom: 16,
},

authBtn: {
  width: "100%",
  backgroundColor: "#7FAF9B",
  padding: 14,
  borderRadius: 12,
  alignItems: "center",
  marginBottom: 10,
},

authBtnText: {
  color: "#0F1E17",
  fontWeight: "800",
},

authBtnOutline: {
  width: "100%",
  borderWidth: 1,
  borderColor: "#7FAF9B",
  padding: 14,
  borderRadius: 12,
  alignItems: "center",
},

authBtnOutlineText: {
  color: "#7FAF9B",
  fontWeight: "800",
},

authCancel: {
  marginTop: 12,
  color: "#999",
},

noResultsWrap: {
  paddingHorizontal: 16,
  paddingTop: 12,
},

noResultsTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#0F1E17",
},

noResultsSub: {
  fontSize: 13,
  color: "#6B7280",
  marginTop: 4,
},

})