import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { AdminGate } from "@/lib/adminGate"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Listing = {
  id: string
  title: string
  price: number
  seller_id: string
  image_urls: string[] | null
}

/* ---------------- CONSTANTS ---------------- */

const SEARCH_TYPES = [
  { key: "listing", label: "Listing ID" },
  { key: "seller", label: "Seller ID" },
  { key: "title", label: "Title Keyword" },
]

const REMOVAL_REASONS = [
  "Not pool related",
  "Violates terms & conditions",
  "False advertising",
  "Prohibited item",
  "Spam / scam",
  "Duplicate listing",
  "Other",
]

/* ---------------- SCREEN ---------------- */

function RemoveListingScreen() {
  const [searchType, setSearchType] = useState("listing")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Listing[]>([])
  const [selected, setSelected] = useState<Listing | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [otherReason, setOtherReason] = useState("")

  /* ---------------- SEARCH ---------------- */

  const searchListings = async () => {
    if (!query.trim()) return

    setLoading(true)
    setResults([])
    setSelected(null)

    let q = supabase
      .from("listings")
      .select("id, title, price, seller_id, image_urls")
      .eq("is_removed", false)
      .limit(10)

    if (searchType === "listing") {
      q = q.eq("id", query)
    } else if (searchType === "seller") {
      q = q.eq("seller_id", query)
    } else {
      q = q.ilike("title", `%${query}%`)
    }

    const { data } = await q
    setResults(data ?? [])
    setLoading(false)
  }

  /* ---------------- REMOVE ---------------- */

  const removeListing = async () => {
    if (!selected || !reason) return

    const finalReason =
      reason === "Other" ? otherReason.trim() : reason

    if (!finalReason) {
      Alert.alert("Reason required")
      return
    }

    Alert.alert(
      "Remove Listing",
      "This will remove the listing and notify the seller.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("listings")
              .update({
                is_removed: true,
                removed_reason: finalReason,
                removed_at: new Date().toISOString(),
              })
              .eq("id", selected.id)

            await supabase.from("messages").insert({
              topic: "admin_notice",
              extension: "listing_removed",
              body: `Your listing "${selected.title}" was removed by Precision moderation.\n\nReason: ${finalReason}`,
              listing_id: selected.id,
              payload: {
                to_user_id: selected.seller_id,
                removed_reason: finalReason,
              },
              private: true,
            })

            Alert.alert("Listing removed")
            setResults([])
            setSelected(null)
            setReason(null)
            setOtherReason("")
            setQuery("")
          },
        },
      ]
    )
  }

  /* ---------------- UI ---------------- */

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={styles.title}>Remove Listing</Text>

      {/* SEARCH TYPE */}
      <View style={styles.toggleRow}>
        {SEARCH_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.toggleBtn,
              searchType === t.key && styles.toggleActive,
            ]}
            onPress={() => setSearchType(t.key)}
          >
            <Text
              style={[
                styles.toggleText,
                searchType === t.key && styles.toggleTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SEARCH INPUT */}
      <TextInput
        style={styles.input}
        placeholder="Enter search value"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.searchBtn} onPress={searchListings}>
        <Text style={styles.searchText}>Search</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {/* RESULTS */}
      {results.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.card,
            selected?.id === item.id && styles.selectedCard,
          ]}
          onPress={() => setSelected(item)}
        >
          {item.image_urls?.[0] && (
            <Image
              source={{ uri: item.image_urls[0] }}
              style={styles.image}
            />
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              ${item.price} • Seller {item.seller_id.slice(0, 6)}
            </Text>
            <Text style={styles.meta}>
              ID {item.id.slice(0, 8)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* REASON */}
      {selected && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Removal Reason</Text>

          {REMOVAL_REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={styles.reasonRow}
              onPress={() => setReason(r)}
            >
              <Ionicons
                name={
                  reason === r
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color="#0F1E17"
              />
              <Text style={styles.reasonText}>{r}</Text>
            </TouchableOpacity>
          ))}

          {reason === "Other" && (
            <TextInput
              style={styles.input}
              placeholder="Enter reason"
              value={otherReason}
              onChangeText={setOtherReason}
            />
          )}
        </View>
      )}

      {/* REMOVE BUTTON */}
      {selected && reason && (
        <TouchableOpacity style={styles.dangerBtn} onPress={removeListing}>
          <Text style={styles.dangerText}>Remove Listing</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

/* ---------------- EXPORT ---------------- */

export default function RemoveListing() {
  return (
    <AdminGate>
      <RemoveListingScreen />
    </AdminGate>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF", padding: 16 },

  title: { fontSize: 20, fontWeight: "800", marginBottom: 12 },

  toggleRow: { flexDirection: "row", marginBottom: 10 },

  toggleBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    marginRight: 6,
  },

  toggleActive: { backgroundColor: "#0F1E17" },

  toggleText: { textAlign: "center", fontWeight: "700" },
  toggleTextActive: { color: "#fff" },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  searchBtn: {
    backgroundColor: "#7FAF9B",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
  },

  searchText: { fontWeight: "800", color: "#0F1E17" },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#0F1E17",
  },

  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 10,
  },

  cardTitle: { fontWeight: "800" },
  meta: { fontSize: 12, color: "#6B8F7D" },

  section: { marginTop: 16 },

  sectionTitle: { fontWeight: "800", marginBottom: 8 },

  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  reasonText: { marginLeft: 8 },

  dangerBtn: {
    marginTop: 20,
    backgroundColor: "#EB5757",
    padding: 14,
    borderRadius: 14,
  },

  dangerText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
})
