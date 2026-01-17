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
}

/* ---------------- SCREEN ---------------- */

export default function HomeScreen() {
  const router = useRouter()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] =
    useState<FilterKey>("all")

  const [hasUnreadMessages, setHasUnreadMessages] =
    useState(false)

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    loadListings()
    setupPushTokenIfNeeded()
  }, [])

  useFocusEffect(
    useCallback(() => {
      checkUnreadMessages()
    }, [])
  )

  const loadListings = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,price,category,condition,image_urls,allow_offers"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (!error && data) {
      const normalized: Listing[] = (data as ListingRow[]).map(
        (l) => ({
          id: l.id,
          title: l.title,
          price: l.price,
          category: l.category,
          image_url: l.image_urls?.[0] ?? null,
          allow_offers: l.allow_offers ?? false,
        })
      )

      setListings(normalized)
    }

    setLoading(false)
  }

  /* ---------------- PUSH TOKEN SETUP ---------------- */

  async function setupPushTokenIfNeeded() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", user.id)
      .single()

    if (error) return
    if (profile?.expo_push_token) return

    // Optional soft prompt before system prompt
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

    await supabase
      .from("profiles")
      .update({
        expo_push_token: token,
        notifications_enabled: true,
      })
      .eq("id", user.id)
  }

  /* ---------------- UNREAD MESSAGES ---------------- */

  async function checkUnreadMessages() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setHasUnreadMessages(false)
      return
    }

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null)

    setHasUnreadMessages(!!count && count > 0)
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
          (l: any) => (l as any).condition === "new"
        )

      case "used":
        return result.filter(
          (l: any) => (l as any).condition !== "new"
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
    <View style={styles.screen}>
      <View style={styles.headerBlock}>
        <HomeHeader
          hasUnreadNotifications={false}
          hasUnreadMessages={hasUnreadMessages}
          onNotificationsPress={() => router.push("/notifications")}
          onMessagesPress={() => router.push("/messages")}
          onProfilePress={() => router.push("/profile")}
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
        <ListingsGrid listings={filteredListings} />
      )}

      {/* FLOATING CREATE LISTING BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/seller-hub/create-listing")}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={20} color="#0F1E17" />
        <Text style={styles.fabText}>Create Listing</Text>
      </TouchableOpacity>
    </View>
  )
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
})
