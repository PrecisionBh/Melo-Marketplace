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

import FilterBar, { FilterKey } from "../components/home/FilterBar"
import HomeHeader from "../components/home/HomeHeader"
import ListingsGrid from "../components/home/ListingsGrid"
import SearchBar from "../components/home/SearchBar"

import { Listing } from "../components/home/ListingCard"
import SportFilterBar, { SportKey } from "../components/home/SportFilterBar"
import { handleAppError } from "../lib/errors/appError"
import { SPORT_CATEGORY_MAP } from "../lib/sportCategories"
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

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)

  const [search, setSearch] = useState("")

  const [activeSport, setActiveSport] =
    useState<SportKey>("all")

  const [activeCategory, setActiveCategory] =
    useState<FilterKey>("all")

  const [hasUnreadMessages, setHasUnreadMessages] =
    useState(false)

  const [hasUnreadNotifications, setHasUnreadNotifications] =
    useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [megaBoostListings, setMegaBoostListings] = useState<Listing[]>([])

  /* ---------------- CATEGORY OPTIONS BY SPORT ---------------- */

  const categoryOptions = useMemo<{
  key: FilterKey
  label: string
}[]>(() => {
  if (activeSport === "all") {
    return [
      { key: "all", label: "All" },
      { key: "cue", label: "Cue" },
      { key: "case", label: "Case" },
      { key: "shaft", label: "Shaft" },
      { key: "apparel", label: "Apparel" },
      { key: "accessories", label: "Accessories" },
      { key: "collectibles", label: "Collectibles" },
      { key: "other", label: "Other" },
    ]
  }

  return SPORT_CATEGORY_MAP[activeSport] ?? [
    { key: "all", label: "All" },
  ]
}, [activeSport])

  /* ---------------- RESET CATEGORY WHEN SPORT CHANGES ---------------- */

  useEffect(() => {
    setActiveCategory("all")
  }, [activeSport])

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
        .range(0, 24)

      if (error) throw error

      const rows = (data ?? []) as ListingRow[]

      const validRows = rows.filter(
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

      setListings(uniqueListings)

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

      setMegaBoostListings(normalizedMegaBoosts)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load listings. Please refresh and try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshListings = async () => {
    setRefreshing(true)
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

    if (activeSport !== "all") {
      const sportCategoryKeys = (
        SPORT_CATEGORY_MAP[activeSport] ?? []
      )
        .map((item) => String(item.key).toLowerCase())
        .filter((key) => key !== "all")

      result = result.filter((l) => {
        const cat = (l.category ?? "").toLowerCase()

        if (sportCategoryKeys.includes(cat)) return true

        if (
          sportCategoryKeys.includes("cue") &&
          (CUE_CATEGORIES.includes(cat) || cat.includes("cue"))
        ) {
          return true
        }

        if (
          sportCategoryKeys.includes("case") &&
          (CASE_CATEGORIES.includes(cat) || cat.includes("case"))
        ) {
          return true
        }

        return false
      })
    }

    if (activeCategory === "all") {
      return result
    }

    const active = (activeCategory ?? "").toLowerCase()

    if (active === "case") {
      return result.filter((l) => {
        const cat = (l.category ?? "").toLowerCase()
        return CASE_CATEGORIES.includes(cat) || cat.includes("case")
      })
    }

    if (active === "cue") {
      return result.filter((l) => {
        const cat = (l.category ?? "").toLowerCase()
        return CUE_CATEGORIES.includes(cat) || cat.includes("cue")
      })
    }

    if (active === "other") {
      const knownCategories = [
        ...CUE_CATEGORIES,
        ...CASE_CATEGORIES,
        "shaft",
        "apparel",
        "accessories",
        "collectibles",
      ]

      return result.filter((l) => {
        const cat = (l.category ?? "").toLowerCase()
        return !knownCategories.includes(cat)
      })
    }

    return result.filter((l) => {
      const cat = (l.category ?? "").toLowerCase()
      return cat === active
    })
  }, [listings, activeCategory, activeSport, search])

  /* ---------------- RENDER ---------------- */

  return (
    <>
      <View style={styles.screen}>
        <View style={styles.headerBlock}>
          <HomeHeader
            hasUnreadNotifications={hasUnreadNotifications}
            hasUnreadMessages={hasUnreadMessages}
            onNotificationsPress={() => router.push("/notifications")}
            onMessagesPress={() => router.push("/messages")}
            onProfilePress={() => router.push("/profile")}
            onMenuPress={() => setMenuOpen(true)}
          />

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search listings"
          />

          <SportFilterBar
            active={activeSport}
            onChange={setActiveSport}
          />

          <FilterBar
            active={activeCategory}
            onChange={setActiveCategory}
            options={categoryOptions}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ListingsGrid
            listings={filteredListings}
            refreshing={refreshing}
            onRefresh={refreshListings}
            showUpgradeRow={!isPro}
            megaBoostListings={megaBoostListings}
            initialScrollOffset={scrollOffset}
            onScrollOffsetChange={setScrollOffset}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/seller-hub/create-listing")}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={20} color="#0F1E17" />
          <Text style={styles.fabText}>Create Listing</Text>
        </TouchableOpacity>
      </View>

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
                router.push("/buyer-hub")
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="heart-outline"
              label="My Likes"
              onPress={() => {
                setMenuOpen(false)
                router.push("/watching")
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="briefcase-outline"
              label="Seller Hub"
              onPress={() => {
                setMenuOpen(false)
                router.push("/seller-hub")
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="wallet-outline"
              label="Wallet"
              onPress={() => {
                setMenuOpen(false)
                router.push("/seller-hub/wallet")
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="create-outline"
              label="Edit Profile"
              onPress={() => {
                setMenuOpen(false)
                router.push("/settings/edit-profile")
              }}
            />

            <MenuDivider />

            <MenuItem
              icon="settings-outline"
              label="Settings"
              onPress={() => {
                setMenuOpen(false)
                router.push("/settings")
              }}
            />
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
    backgroundColor: "#EAF4EF",
  },
  headerBlock: {
    backgroundColor: "#7FAF9B",
    paddingBottom: 10,
  },
  fab: {
    position: "absolute",
    bottom: 55,
    left: 24,
    right: 24,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#7FAF9B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
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
})