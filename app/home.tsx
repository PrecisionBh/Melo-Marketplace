import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import FilterBar, { FilterKey } from "../components/home/FilterBar"
import HomeHeader from "../components/home/HomeHeader"
import ListingsGrid from "../components/home/ListingsGrid"
import SearchBar from "../components/home/SearchBar"

import { Listing } from "../components/home/ListingCard"
import { handleAppError } from "../lib/errors/appError"
import { registerForPushNotifications } from "../lib/notifications"
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
  brand?: string | null
  price: number
  category: string
  condition?: string | null
  image_urls: string[] | null
  allow_offers?: boolean | null
  shipping_type?: "seller_pays" | "buyer_pays" | null
  is_sold: boolean
  is_removed: boolean
  user_id?: string
  is_boosted?: boolean | null
  boost_expires_at?: string | null
}

/* ---------------- SCREEN ---------------- */

export default function HomeScreen() {
  const router = useRouter()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] =
    useState<FilterKey>("all")

  const [hasUnreadMessages, setHasUnreadMessages] =
    useState(false)

  const [hasUnreadNotifications, setHasUnreadNotifications] =
    useState(false)

  const [menuOpen, setMenuOpen] = useState(false)

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    setupPushTokenIfNeeded()
  }, [])

  useEffect(() => {
  setupPushTokenIfNeeded()
}, [])

// 🚫 ADD BAN CHECK RIGHT HERE (EXACT LOCATION)
useEffect(() => {
  const enforceBan = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) return

      const { data, error } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", user.id)
        .single()

      if (error) {
        console.log("[HOME] Ban check error:", error.message)
        return
      }

      if (data?.is_banned === true) {
        console.log("[HOME] 🚫 BANNED USER DETECTED ON HOME — SIGNING OUT")
        await supabase.auth.signOut()

        Alert.alert(
          "Account Suspended",
          "Your account has been suspended. Please contact support."
        )

        router.replace("/login") // or your auth route
      }
    } catch (err) {
      console.log("[HOME] Ban enforcement failed:", err)
    }
  }

  enforceBan()
}, [])

  useFocusEffect(
    useCallback(() => {
      loadListings()
      checkUnreadMessages()
      checkUnreadNotifications()
    }, [])
  )

  const loadListings = async () => {
    setLoading(true)

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
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,description,brand,price,category,condition,image_urls,allow_offers,shipping_type,is_sold,is_removed,user_id,is_boosted,boost_expires_at"
        )
        .eq("status", "active")
        .eq("is_sold", false)
        .eq("is_removed", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      const rows = (data ?? []) as ListingRow[]

      const validRows = rows.filter(
        (l) =>
          Array.isArray(l.image_urls) &&
          l.image_urls.length > 0 &&
          l.title?.trim().length > 0 &&
          Number(l.price) > 0
      )

      const now = new Date().toISOString()

      const boostedRows = validRows.filter(
        (l) =>
          l.is_boosted === true &&
          l.boost_expires_at &&
          l.boost_expires_at > now
      )

      const nonBoostedRows = validRows.filter(
        (l) =>
          !l.is_boosted ||
          !l.boost_expires_at ||
          l.boost_expires_at <= now
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
        // IMPORTANT: do NOT pass nullable condition to Listing type
        // ListingCard type does not include condition, so we omit it
        image_url: l.image_urls?.[0] ?? null,
        allow_offers: l.allow_offers ?? false,
        shipping_type: l.shipping_type ?? null,
      }))

      setListings(normalized)
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

  /* ---------------- UNREAD COUNTS ---------------- */

const checkUnreadMessages = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      setHasUnreadMessages(false)
      return
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id")
      .eq("receiver_id", user.id) // ✅ CORRECT COLUMN
      .eq("is_read", false)       // ✅ MATCHES YOUR SCHEMA
      .limit(1)

    if (error) throw error

    setHasUnreadMessages((data?.length ?? 0) > 0)
  } catch (err) {
    console.error("checkUnreadMessages error:", err)
    setHasUnreadMessages(false)
  }
}

const checkUnreadNotifications = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      setHasUnreadNotifications(false)
      return
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id) // ✅ CORRECT
      .eq("read", false)      // ✅ MATCHES YOUR TABLE
      .limit(1)

    if (error) throw error

    setHasUnreadNotifications((data?.length ?? 0) > 0)
  } catch (err) {
    console.error("checkUnreadNotifications error:", err)
    setHasUnreadNotifications(false)
  }
}

  /* ---------------- PUSH TOKEN SETUP ---------------- */

  async function setupPushTokenIfNeeded() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("expo_push_token")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError

      if (profile?.expo_push_token) return

      const confirm = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Enable Notifications?",
          "Get notified about messages, offers, and order updates.",
          [
            { text: "Not Now", onPress: () => resolve(false) },
            { text: "Enable", onPress: () => resolve(true) },
          ]
        )
      })

      if (!confirm) return

      const token = await registerForPushNotifications()
      if (!token) return

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          expo_push_token: token,
          notifications_enabled: true,
        })
        .eq("id", user.id)

      if (updateError) throw updateError
    } catch (err) {
      console.error("Push setup error:", err)
    }
  }

   /* ---------------- FILTERING (FIXED & STABLE) ---------------- */

  const filteredListings = useMemo(() => {
    let result = [...listings]

    /* 🔎 GLOBAL SEARCH (TITLE + CATEGORY — SAFE FOR CURRENT LISTING TYPE) */
    if (search.trim()) {
      const q = search.toLowerCase().trim()

      result = result.filter((l) => {
        const title = (l.title ?? "").toLowerCase()
        const category = (l.category ?? "").toLowerCase()

        return (
          title.includes(q) ||
          category.includes(q)
        )
      })
    }

    /* 🎯 CATEGORY FILTERING (MARKETPLACE-SAFE + CASE BUG FIX) */
    if (activeCategory === "all") {
      return result
    }

    const active = (activeCategory ?? "").toLowerCase()

    // 🧳 CASE PILL — matches: case, hard_case, soft_case
    if (active === "case") {
      return result.filter((l) => {
        const cat = (l.category ?? "").toLowerCase()
        return CASE_CATEGORIES.includes(cat) || cat.includes("case")
      })
    }

    // 🎱 CUE PILL — matches all cue types
    if (active === "cue") {
      return result.filter((l) => {
        const cat = (l.category ?? "").toLowerCase()
        return CUE_CATEGORIES.includes(cat) || cat.includes("cue")
      })
    }

    // 📦 OTHER PILL — everything not in known marketplace categories
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

    // 🔒 DEFAULT EXACT MATCH (for apparel, shaft, accessories, etc.)
    return result.filter((l) => {
      const cat = (l.category ?? "").toLowerCase()
      return cat === active
    })
  }, [listings, activeCategory, search])

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

          <FilterBar
            active={activeCategory}
            onChange={setActiveCategory}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ListingsGrid
            listings={filteredListings}
            refreshing={refreshing}
            onRefresh={refreshListings}
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

      {/* 🔥 UPGRADED DROPDOWN MENU OVERLAY */}
      {menuOpen && (
        <View style={styles.menuOverlay} pointerEvents="box-none">
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />

          {/* Dropdown Card */}
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