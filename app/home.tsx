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

const CASE_CATEGORIES = ["hard_case", "soft_case"]

/* ---------------- DB ROW TYPE ---------------- */

type ListingRow = {
  id: string
  title: string
  price: number
  category: string
  condition: string
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

      // Get followed sellers (safe if not logged in or none followed)
      let followedSellerIds: string[] = []

      if (user) {
        const { data: followsData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)

        followedSellerIds =
          followsData?.map((f: any) => f.following_id) ?? []
      }

      // Fetch ALL active listings
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,price,category,condition,image_urls,allow_offers,shipping_type,is_sold,is_removed,user_id,is_boosted,boost_expires_at"
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

      // 1️⃣ Active boosted listings (not expired)
      const boostedRows = validRows.filter(
        (l) =>
          l.is_boosted === true &&
          l.boost_expires_at &&
          l.boost_expires_at > now
      )

      // 2️⃣ Remove boosted from main pool (prevents duplicates)
      const nonBoostedRows = validRows.filter(
        (l) =>
          !l.is_boosted ||
          !l.boost_expires_at ||
          l.boost_expires_at <= now
      )

      // 3️⃣ Followed sellers (from non-boosted pool)
      const followedRows = nonBoostedRows.filter((l) =>
        followedSellerIds.includes(l.user_id ?? "")
      )

      // 4️⃣ New listings (everything else)
      const newRows = nonBoostedRows.filter(
        (l) => !followedSellerIds.includes(l.user_id ?? "")
      )

      // 5️⃣ 3 ROW BLOCK FEED (3 Boosted → 3 Followed → 3 New)
      const merged: ListingRow[] = []

      let bIndex = 0
      let fIndex = 0
      let nIndex = 0

      while (
        bIndex < boostedRows.length ||
        fIndex < followedRows.length ||
        nIndex < newRows.length
      ) {
        // Row 1: Boosted (fallback → followed → new)
        for (let i = 0; i < 3; i++) {
          if (bIndex < boostedRows.length) {
            merged.push(boostedRows[bIndex])
            bIndex++
          } else if (fIndex < followedRows.length) {
            merged.push(followedRows[fIndex])
            fIndex++
          } else if (nIndex < newRows.length) {
            merged.push(newRows[nIndex])
            nIndex++
          }
        }

        // Row 2: Followed (fallback → new → boosted)
        for (let i = 0; i < 3; i++) {
          if (fIndex < followedRows.length) {
            merged.push(followedRows[fIndex])
            fIndex++
          } else if (nIndex < newRows.length) {
            merged.push(newRows[nIndex])
            nIndex++
          } else if (bIndex < boostedRows.length) {
            merged.push(boostedRows[bIndex])
            bIndex++
          }
        }

        // Row 3: New listings (fallback → followed → boosted)
        for (let i = 0; i < 3; i++) {
          if (nIndex < newRows.length) {
            merged.push(newRows[nIndex])
            nIndex++
          } else if (fIndex < followedRows.length) {
            merged.push(followedRows[fIndex])
            fIndex++
          } else if (bIndex < boostedRows.length) {
            merged.push(boostedRows[bIndex])
            bIndex++
          }
        }

        // Safety break to avoid infinite loops
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
        category: l.category,
        condition: l.condition,
        image_url: l.image_urls![0],
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
    // Silent fail on purpose (do NOT annoy user on home load)
  }
}


  /* ---------------- UNREAD MESSAGES ---------------- */

async function checkUnreadMessages() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setHasUnreadMessages(false)
      return
    }

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null)

    if (error) throw error

    setHasUnreadMessages(!!count && count > 0)
  } catch (err) {
    console.error("Unread messages check error:", err)
    setHasUnreadMessages(false) // Fail safe UI
  }
}

async function checkUnreadNotifications() {
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

    if (error) throw error

    setHasUnreadNotifications(!!count && count > 0)
  } catch (err) {
    console.error("Unread notifications error:", err)
    setHasUnreadNotifications(false) // Never break header UI
  }
}


  /* ---------------- FILTERING ---------------- */

  const filteredListings = useMemo(() => {
    let result = [...listings]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l) =>
        l.title.toLowerCase().includes(q)
      )
    }

    switch (activeCategory) {
  case "cues":
    return result.filter((l) =>
      CUE_CATEGORIES.includes(l.category)
    )

  case "cases":
    return result.filter((l) =>
      CASE_CATEGORIES.includes(l.category)
    )

  case "new":
    return result.filter(
      (l: any) =>
        l.condition &&
        l.condition.toLowerCase() === "new"
    )

  case "used":
    return result.filter(
      (l: any) =>
        l.condition &&
        l.condition.toLowerCase() !== "new"
    )

  case "other":
    return result.filter(
      (l) =>
        !CUE_CATEGORIES.includes(l.category) &&
        !CASE_CATEGORIES.includes(l.category)
    )

  default:
    return result
}

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

  /* 🔥 UPGRADED MENU STYLES */
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
