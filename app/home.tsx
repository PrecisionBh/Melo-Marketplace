import { useFocusEffect, useRouter } from "expo-router"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
  description?: string | null
  price: number
  category: string
  image_urls: string[] | null
  video_url?: string | null
  shipping_type?: "seller_pays" | "buyer_pays" | null
  user_id?: string
  is_boosted?: boolean | null
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
  const scrollOffsetRef = useRef(0)

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

  
  const [page, setPage] = useState(0)
const PAGE_SIZE = 30
const [hasMore, setHasMore] = useState(true)
const [loadingMore, setLoadingMore] = useState(false)



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

          const { data: boostedData } = await supabase
  .from("listings")
  .select(
    "id,title,description,price,category,image_urls,video_url,shipping_type,user_id,is_boosted,created_at"
  )
  .eq("status", "active")
  .eq("is_sold", false)
  .eq("is_removed", false)
  .eq("is_boosted", true)

      const { data, error } = await supabase
        .from("listings")
        .select(
  "id,title,description,price,category,image_urls,video_url,shipping_type,user_id,is_boosted,created_at"
)
        .eq("status", "active")
        .eq("is_sold", false)
        .eq("is_removed", false)
        .eq("is_boosted", false)
.order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      if (error) throw error

      const rows = [
  ...((boostedData ?? []) as ListingRow[]),
  ...((data ?? []) as ListingRow[]),
]

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


const shuffle = (array: ListingRow[]) => {
  return [...array].sort(() => Math.random() - 0.5)
}

/* ---------------- BUCKETS ---------------- */

const boostedRows = shuffle(
  validRows.filter((l) => l.is_boosted === true)
)

const followedRows = shuffle(
  validRows.filter(
    (l) =>
      !l.is_boosted &&
      followedSellerIds.includes(l.user_id ?? "")
  )
)

const normalRows = shuffle(
  validRows.filter(
    (l) =>
      !l.is_boosted &&
      !followedSellerIds.includes(l.user_id ?? "")
  )
)

/* ---------------- FEED BUILD ---------------- */

const orderedRows: ListingRow[] = []

let bIndex = 0
let fIndex = 0
let nIndex = 0

const takeItems = (
  source: ListingRow[],
  count: number,
  indexRef: { value: number }
) => {
  const items: ListingRow[] = []

  for (let i = 0; i < count; i++) {
    if (indexRef.value < source.length) {
      items.push(source[indexRef.value++])
    }
  }

  return items
}

while (
  bIndex < boostedRows.length ||
  fIndex < followedRows.length ||
  nIndex < normalRows.length
) {
  /* ---------------- BOOSTED ROW ---------------- */

  let boostedChunk = takeItems(
    boostedRows,
    3,
    { value: bIndex }
  )

  bIndex += boostedChunk.length

  if (boostedChunk.length < 3) {
    const filler = takeItems(
      normalRows,
      3 - boostedChunk.length,
      { value: nIndex }
    )

    nIndex += filler.length

    boostedChunk = [...boostedChunk, ...filler]
  }

  orderedRows.push(...boostedChunk)

  /* ---------------- FOLLOWED ROW ---------------- */

  let followedChunk = takeItems(
    followedRows,
    3,
    { value: fIndex }
  )

  fIndex += followedChunk.length

  if (followedChunk.length < 3) {
    const filler = takeItems(
      normalRows,
      3 - followedChunk.length,
      { value: nIndex }
    )

    nIndex += filler.length

    followedChunk = [...followedChunk, ...filler]
  }

  orderedRows.push(...followedChunk)

  /* ---------------- NORMAL ROW ---------------- */

  const normalChunk = takeItems(
    normalRows,
    3,
    { value: nIndex }
  )

  nIndex += normalChunk.length

  orderedRows.push(...normalChunk)
}

const uniqueOrderedRows = Array.from(
  new Map(
    orderedRows.map((item) => [item.id, item])
  ).values()
)

const normalizedListings: Listing[] =
  uniqueOrderedRows.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description ?? "",
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



if (page === 0) {
  setListings(uniqueListings)
} else {
  setListings((prev) =>
    Array.from(
      new Map(
        [...prev, ...uniqueListings].map((item) => [item.id, item])
      ).values()
    )
  )

  
}
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
  const source =
    search.trim() || activeCategory !== "all" || minPrice.trim() || maxPrice.trim()
      ? allListings
      : listings

  let result: any[] = source.map((l: any) => ({
    id: l.id,
    title: l.title,
    description: l.description ?? "",
    price: Number(l.price),
    category: l.category ?? "",
    image_url: l.image_url ?? l.image_urls?.[0] ?? null,
    allow_offers: false,
    shipping_type: l.shipping_type ?? null,
  }))

  if (search.trim()) {
    const q = search.toLowerCase().trim()

    result = result.filter((l) => {
      const title = (l.title ?? "").toLowerCase()
      const description = (l.description ?? "").toLowerCase()
      const category = (l.category ?? "").toLowerCase()

      return (
        title.includes(q) ||
        description.includes(q) ||
        category.includes(q)
      )
    })
  }

  if (minPrice.trim()) {
    const min = parseFloat(minPrice)
    if (!isNaN(min)) {
      result = result.filter((l) => Number(l.price) >= min)
    }
  }

  if (maxPrice.trim()) {
    const max = parseFloat(maxPrice)
    if (!isNaN(max)) {
      result = result.filter((l) => Number(l.price) <= max)
    }
  }

  if (activeCategory !== "all") {
    const active = String(activeCategory).toLowerCase()
    result = result.filter(
      (l) => String(l.category ?? "").toLowerCase() === active
    )
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
  key={`${activeCategory}-${search}`}
  listings={filteredListings}
  refreshing={refreshing}
  onRefresh={refreshListings}
  onScrollOffsetChange={(y) => {
    scrollOffsetRef.current = y
  }}
  onEndReached={loadMoreListings}
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