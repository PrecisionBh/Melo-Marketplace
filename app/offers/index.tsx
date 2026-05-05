import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { useFocusEffect, useRouter } from "expo-router"

import { useCallback, useMemo, useState } from "react"
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Tab = "active" | "completed" | "expired"

export default function OffersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [tab, setTab] = useState<Tab>("active")
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<any[]>([])

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return
      loadOffers()
    }, [session?.user?.id])
  )

  const loadOffers = async () => {
    try {
      setLoading(true)

      const userId = session?.user?.id
      if (!userId) return

      const { data, error } = await supabase
        .from("offers")
        .select(`
          id,
          status,
          current_amount,
          created_at,
          listings (
            title,
            image_urls
          )
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false })

      if (error) throw error

      setOffers(data ?? [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load offers.",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      if (tab === "active") {
        return o.status === "pending" || o.status === "countered"
      }

      if (tab === "completed") {
        return o.status === "accepted"
      }

      if (tab === "expired") {
        return (
          o.status === "expired" ||
          o.status === "cancelled" ||
          o.status === "declined"
        )
      }

      return true
    })
  }, [offers, tab])

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Offers</Text>

        {/* 🔥 TABS */}
        <View style={styles.tabsWrap}>
          {["active", "completed", "expired"].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t as Tab)}
              style={[
                styles.tabBtn,
                tab === t && styles.activeTabBtn,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === t && styles.activeTabText,
                ]}
              >
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 🔥 LOADING */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : filteredOffers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No offers here yet
            </Text>
            <Text style={styles.emptySub}>
              Your offers will appear here.
            </Text>
          </View>
        ) : (
          filteredOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onPress={() =>
                router.push(`/offers/${offer.id}`)
              }
            />
          ))
        )}
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

function OfferCard({
  offer,
  onPress,
}: {
  offer: any
  onPress: () => void
}) {
  const image =
    offer.listings?.image_urls?.[0] ??
    "https://via.placeholder.com/150"

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
    >
      <Image source={{ uri: image }} style={styles.image} />

      <View style={styles.info}>
        <Text style={styles.titleText}>
          {offer.listings?.title || "Offer"}
        </Text>

        <Text style={styles.price}>
          ${Number(offer.current_amount).toFixed(2)}
        </Text>

        <Text style={styles.status}>
          {offer.status.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 18,
  },

  tabsWrap: {
    flexDirection: "row",
    backgroundColor: "#ECECEC",
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  activeTabBtn: {
    backgroundColor: "#D97732",
  },

  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },

  activeTabText: {
    color: "#fff",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 28,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  emptySub: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  image: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },

  info: {
    flex: 1,
  },

  titleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  price: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "800",
  },

  status: {
    marginTop: 4,
    fontSize: 12,
    color: "#777",
  },
})