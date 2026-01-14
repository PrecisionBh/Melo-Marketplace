import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

import ListingCard, { Listing } from "../components/home/ListingCard"

type TabKey = "listings" | "in_progress" | "completed"

type ListingRow = {
  id: string
  title: string
  price: number
  category: string
  image_urls: string[] | null
  allow_offers?: boolean | null
}

export default function SellingScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>("listings")
  const [search, setSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(false)

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Listing[]>([])

  useEffect(() => {
    loadMyListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sortAsc])

  const loadMyListings = async () => {
    setLoading(true)

    const user = session?.user
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }

    const status =
      activeTab === "listings"
        ? "active"
        : activeTab === "in_progress"
        ? "in_progress"
        : "completed"

    const { data, error } = await supabase
      .from("listings")
      .select("id,title,price,category,image_urls,allow_offers")
      .eq("user_id", user.id)
      .eq("status", status)
      .order("created_at", { ascending: sortAsc })

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

      setItems(normalized)
    } else {
      setItems([])
    }

    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((l) =>
      l.title.toLowerCase().includes(q)
    )
  }, [items, search])

  const onCreateListing = () => {
    router.push("/create-listing")
  }

  const onEditListing = (id: string) => {
    router.push({
      pathname: "/edit-listing/[id]" as any,
      params: { id },
    } as any)
  }

  return (
    <View style={styles.screen}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Selling</Text>

        <TouchableOpacity style={[styles.iconBtn, { opacity: 0.6 }]}>
          <Text style={styles.bulkEdit}>Bulk edit</Text>
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TabButton
          label="Listings"
          active={activeTab === "listings"}
          onPress={() => setActiveTab("listings")}
        />
        <TabButton
          label="In progress"
          active={activeTab === "in_progress"}
          onPress={() => setActiveTab("in_progress")}
        />
        <TabButton
          label="Completed"
          active={activeTab === "completed"}
          onPress={() => setActiveTab("completed")}
        />
      </View>

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your listings"
            placeholderTextColor="#888"
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity
          onPress={() => setSortAsc((p) => !p)}
          style={styles.sortBtn}
        >
          <Ionicons name="swap-vertical" size={20} color="#222" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            Create a listing to start making money!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ padding: 8, paddingBottom: 160 }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              mode="seller"
              onEdit={() => onEditListing(item.id)}
            />
          )}
        />
      )}

      {/* FLOATING CREATE LISTING BUTTON */}
      <View style={styles.fabWrap}>
        <TouchableOpacity style={styles.fab} onPress={onCreateListing}>
          <Ionicons name="add" size={18} color="#0F1E17" />
          <Text style={styles.fabText}>Create Listing</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ---------------- UI bits ---------------- */

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabUnderline} />}
    </TouchableOpacity>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconBtn: { padding: 6 },

  topTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  bulkEdit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },

  tabText: { color: "#888", fontWeight: "600" },
  tabTextActive: { color: "#111", fontWeight: "800" },

  tabUnderline: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: "70%",
    backgroundColor: "#111",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F1F1",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchInput: { flex: 1, marginLeft: 8, color: "#111" },

  sortBtn: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },

  fabWrap: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#7FAF9B",
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  fabText: {
    color: "#0F1E17",
    fontWeight: "900",
    fontSize: 14,
  },
})
