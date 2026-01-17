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

import { AdminGate } from "@/lib/adminGate"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Dispute = {
  id: string
  order_id: string
  status: string
  created_at: string
}

/* ---------------- SCREEN ---------------- */

function AdminDisputesScreen() {
  const router = useRouter()

  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"unresolved" | "resolved">("unresolved")
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadDisputes()
  }, [tab])

  const loadDisputes = async () => {
    setLoading(true)

    const statuses =
      tab === "unresolved"
        ? ["open", "under_review"]
        : ["resolved", "refunded"]

    const { data, error } = await supabase
      .from("disputes")
      .select("id, order_id, status, created_at")
      .in("status", statuses)
      .order("created_at", { ascending: false })

    if (!error) {
      setDisputes(data ?? [])
    }

    setLoading(false)
  }

  /* ---------------- SEARCH FILTER ---------------- */

  const filteredDisputes = useMemo(() => {
    if (!search.trim()) return disputes

    return disputes.filter((d) =>
      d.order_id.toLowerCase().includes(search.toLowerCase())
    )
  }, [search, disputes])

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Disputes</Text>
      </View>

      {/* TOGGLE */}
      <View style={styles.toggleRow}>
        <ToggleButton
          label="Unresolved"
          active={tab === "unresolved"}
          onPress={() => setTab("unresolved")}
        />
        <ToggleButton
          label="Resolved"
          active={tab === "resolved"}
          onPress={() => setTab("resolved")}
        />
      </View>

      {/* SEARCH */}
      <TextInput
        style={styles.search}
        placeholder="Search by order ID"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      {/* LIST */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : filteredDisputes.length === 0 ? (
        <Text style={styles.empty}>No disputes found.</Text>
      ) : (
        <FlatList
          data={filteredDisputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push(
                  `/admin/dispute-detail?disputeId=${item.id}`
                )
              }
            >
              <Text style={styles.order}>
                Order #{item.order_id.slice(0, 8)}
              </Text>

              <StatusBadge status={item.status} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.toggleBtn,
        active && styles.toggleActive,
      ]}
    >
      <Text
        style={[
          styles.toggleText,
          active && styles.toggleTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "#F2C94C",
    under_review: "#56CCF2",
    resolved: "#27AE60",
    refunded: "#EB5757",
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: map[status] ?? "#BDBDBD" },
      ]}
    >
      <Text style={styles.badgeText}>
        {status.replace("_", " ").toUpperCase()}
      </Text>
    </View>
  )
}

/* ---------------- EXPORT WITH ADMIN GATE ---------------- */

export default function AdminDisputes() {
  return (
    <AdminGate>
      <AdminDisputesScreen />
    </AdminGate>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    marginRight: 8,
  },

  toggleActive: {
    backgroundColor: "#0F1E17",
  },

  toggleText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#444",
  },

  toggleTextActive: {
    color: "#fff",
  },

  search: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#666",
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },

  order: {
    fontWeight: "800",
    marginBottom: 6,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
})
