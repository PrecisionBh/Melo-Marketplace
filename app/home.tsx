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

import { useCart } from "@/context/CartContext"
import { Ionicons } from "@expo/vector-icons"
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
  video_url?: string | null
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
  const { cartCount } = useCart()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [messageCount, setMessageCount] = useState(0)

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

  const [isPro, setIsPro] = useState(false)
  const [megaBoostListings, setMegaBoostListings] = useState<Listing[]>([])
  const [page, setPage] = useState(0)
const PAGE_SIZE = 30
const [hasMore, setHasMore] = useState(true)
const [loadingMore, setLoadingMore] = useState(false)

useEffect(() => {
  const threshold = 1000

  if (scrollOffset > threshold && hasMore && !loadingMore) {
    loadMoreListings()
  }
}, [scrollOffset, hasMore, loadingMore])

  const requireAuth = (action?: () => void) => {
    if (!session?.user) {
      setShowAuthModal(true)
      return
    }

    action?.()
  }

 



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
  "id,title,price,category,image_urls,video_url,shipping_type,user_id,is_boosted,is_mega_boost,created_at"
)
        .eq("status", "active")
        .eq("is_sold", false)
        .eq("is_removed", false)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (error) throw error

      const rows = (data ?? []) as ListingRow[]

const mergedAllListings =
  page === 0
    ? rows
    : Array.from(
        new Map(
          [...allListings, ...rows].map((item) => [item.id, item])
        ).values()
      )

setAllListings(mergedAllListings)

if (rows.length < PAGE_SIZE) {
  setHasMore(false)
} else {
  setHasMore(true)
}

const validRows = mergedAllListings.filter(
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
// 🔥 SHUFFLE NORMAL LISTINGS
const shuffle = (array: ListingRow[]) => {
  return [...array].sort(() => Math.random() - 0.5)
}

const shuffledNonBoosted = shuffle(nonBoostedRows)

const followedRows = shuffledNonBoosted.filter((l) =>
  followedSellerIds.includes(l.user_id ?? "")
)

const newRows = shuffledNonBoosted.filter(
  (l) => !followedSellerIds.includes(l.user_id ?? "")
)

const orderedRows: ListingRow[] = []

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
      orderedRows.push(boostedRows[bIndex++])
    } else if (fIndex < followedRows.length) {
      orderedRows.push(followedRows[fIndex++])
    } else if (nIndex < newRows.length) {
      orderedRows.push(newRows[nIndex++])
    }
  }

  for (let i = 0; i < 3; i++) {
    if (fIndex < followedRows.length) {
      orderedRows.push(followedRows[fIndex++])
    } else if (nIndex < newRows.length) {
      orderedRows.push(newRows[nIndex++])
    } else if (bIndex < boostedRows.length) {
      orderedRows.push(boostedRows[bIndex++])
    }
  }

  for (let i = 0; i < 3; i++) {
    if (nIndex < newRows.length) {
      orderedRows.push(newRows[nIndex++])
    } else if (fIndex < followedRows.length) {
      orderedRows.push(followedRows[fIndex++])
    } else if (bIndex < boostedRows.length) {
      orderedRows.push(boostedRows[bIndex++])
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

const normalizedListings: Listing[] = orderedRows.map((l) => ({
  id: l.id,
  title: l.title,
  price: Number(l.price),
  category: l.category ?? "",
  image_url: l.image_urls?.[0] ?? null,
  allow_offers: false,
  shipping_type: l.shipping_type ?? null,
}))

const uniqueListings = Array.from(
  new Map(
    normalizedListings.map((item) => [item.id, item])
  ).values()
)

const normalizedMegaBoosts: Listing[] = activeMegaBoostRows.map((l) => ({
  id: l.id,
  title: l.title,
  price: Number(l.price),
  category: l.category ?? "",
  image_url: l.image_urls?.[0] ?? null,
  video_url: l.video_url ?? null, // 🔥 ONLY HERE
  allow_offers: false,
  shipping_type: l.shipping_type ?? null,
}))

const uniqueMegaBoosts = Array.from(
  new Map(
    normalizedMegaBoosts.map((item) => [item.id, item])
  ).values()
)

if (page === 0) {
  setListings(uniqueListings)
  setMegaBoostListings(uniqueMegaBoosts)
} else {
  setListings((prev) =>
    Array.from(
      new Map(
        [...prev, ...uniqueListings].map((item) => [item.id, item])
      ).values()
    )
  )

  setMegaBoostListings((prev) =>
    Array.from(
      new Map(
        [...prev, ...uniqueMegaBoosts].map((item) => [item.id, item])
      ).values()
    )
  )
}
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
  setListings([])
  setMegaBoostListings([])
  await loadListings()
  setRefreshing(false)
}

const checkUnreadMessages = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessageCount(0)
      return
    }

    // 🔥 STEP 1: get conversations YOU are part of
    const { data: conversations, error: convErr } = await supabase
      .from("conversations")
      .select("id")
      .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)

    if (convErr) throw convErr

    const conversationIds = conversations?.map(c => c.id) || []

    if (conversationIds.length === 0) {
      setMessageCount(0)
      return
    }

    // 🔥 STEP 2: count unread messages NOT sent by you
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id)
      .is("read_at", null)

    if (error) throw error

    console.log("💬 REAL message count:", count)

    setMessageCount(count ?? 0)
  } catch (err) {
    console.log("❌ message count error:", err)
    setMessageCount(0)
  }
}


  const checkUnreadNotifications = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setHasUnreadNotifications(false)
      setNotifCount(0)
      return
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .or("cleared.is.null,cleared.eq.false")

    if (error) throw error

    console.log("🔔 REAL notif count:", count)

    // ✅ SET BOTH
    setHasUnreadNotifications((count ?? 0) > 0)
    setNotifCount(count || 0)

  } catch (err) {
    handleAppError(err, {
      context: "check_unread_notifications",
    })

    setHasUnreadNotifications(false)
    setNotifCount(0)
  }
}

  const filteredListings = useMemo(() => {
  // 🔥 normalize both sources into same shape
  let result: any[] =
    activeCategory === "all"
      ? [...listings]
      : allListings.map((l) => ({
          id: l.id,
          title: l.title,
          price: Number(l.price),
          category: l.category ?? "",
          image_url: l.image_urls?.[0] ?? null,
          allow_offers: false,
          shipping_type: l.shipping_type ?? null,
          is_mega_boost: l.is_mega_boost ?? false,
        }))

  // 🔥 SEARCH
  if (search.trim()) {
    const q = search.toLowerCase().trim()

    result = result.filter((l) => {
      const title = (l.title ?? "").toLowerCase()
      const category = (l.category ?? "").toLowerCase()

      return title.includes(q) || category.includes(q)
    })
  }

  // 🔥 PRICE FILTERS
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

  // 🔥 CATEGORY FILTER
  if (activeCategory !== "all") {
    const active = (activeCategory ?? "").toLowerCase()

    result = result.filter((l) => {
      const cat = (l.category ?? "").toLowerCase()
      return cat === active
    })
  }

  // 🔥 SORT BOOSTS (AFTER filtering)
  if (activeCategory !== "all") {
    result.sort((a, b) => {
      if (b.is_mega_boost && !a.is_mega_boost) return 1
      if (!b.is_mega_boost && a.is_mega_boost) return -1
      return 0
    })
  }

  return result
}, [
  listings,
  allListings,
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
    notifCount={notifCount}
    messageCount={messageCount}
    cartCount={cartCount}
    
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
/>
</View>

{loading ? (
  <ActivityIndicator style={{ marginTop: 40 }} />
) : (
  <>
    {hasActiveFilters && filteredListings.length === 0 && (
      <View style={styles.emptyState}>
  <View style={styles.emptyIconWrap}>
    <Ionicons name="cube-outline" size={28} color="#9CA3AF" />
  </View>

  <Text style={styles.emptyTitle}>
    {activeCategory !== "all" &&
    !search.trim() &&
    !minPrice.trim() &&
    !maxPrice.trim()
      ? "No listings yet"
      : "No results found"}
  </Text>

  <Text style={styles.emptySub}>
    {activeCategory !== "all" &&
    !search.trim() &&
    !minPrice.trim() &&
    !maxPrice.trim()
      ? "Be the first to list in this category."
      : "Try adjusting your filters or search."}
  </Text>

  {/* 🔥 CTA BUTTON */}
  <TouchableOpacity
    style={styles.emptyBtn}
    onPress={() => router.push("/create-listing")}
  >
    <Text style={styles.emptyBtnText}>
      Create Listing
    </Text>
  </TouchableOpacity>
</View>
    )}

    <ListingsGrid
     key={activeCategory}
  listings={filteredListings}
  refreshing={refreshing}
  onRefresh={refreshListings}
  showUpgradeRow={!isPro}
  megaBoostListings={
    activeCategory === "all"
      ? megaBoostListings
      : [] // 🚨 THIS IS THE FIX
  }
  onScrollOffsetChange={setScrollOffset}
/>

    {loadingMore && (
  <ActivityIndicator style={{ marginVertical: 20 }} />
)}
  </>
)}

      </View>
      <GlobalFooter />

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

emptyState: {
  alignItems: "center",
  justifyContent: "center",
  paddingTop: 40,
  paddingHorizontal: 20,
},

emptyIconWrap: {
  width: 56,
  height: 56,
  borderRadius: 16,
  backgroundColor: "#F3F4F6",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
},

emptyTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#0F1E17",
  marginBottom: 6,
  textAlign: "center",
},

emptySub: {
  fontSize: 14,
  color: "#6B7280",
  textAlign: "center",
  marginBottom: 18,
},

emptyBtn: {
  backgroundColor: "#D97732",
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 12,
},

emptyBtnText: {
  color: "#ffffff",
  fontWeight: "800",
},

})