import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { Ionicons } from "@expo/vector-icons"
import * as Linking from "expo-linking"
import {
  useCallback,
  useEffect,
  useState,
} from "react"

import { useFocusEffect } from "@react-navigation/native"
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

type Wallet = {
  id: string
  available_balance_cents: number
  pending_balance_cents: number
  lifetime_earnings_cents: number
}

type Profile = {
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
}

type OrderRow = {
  id: string
  completed_at: string
  seller_net_cents: number
  listing_snapshot: any
}

type Payout = {
  id: string
  net_cents: number
  created_at: string
  status: string
}

type TabKey = "overview" | "withdraw" | "payouts"

function parseListingSnapshot(snapshot: any) {
  if (!snapshot) return null
  if (typeof snapshot === "object") return snapshot

  try {
    return JSON.parse(snapshot)
  } catch {
    return null
  }
}

export default function WalletScreen() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [tab, setTab] = useState<TabKey>("overview")

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])

  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [rawAmount, setRawAmount] = useState("")

  useEffect(() => {
    if (userId) loadData()
  }, [userId])

useFocusEffect(
  useCallback(() => {
    if (userId) {
      loadData()
    }
  }, [userId])
)

  const loadData = async () => {
    try {
      setLoading(true)

      const [
        { data: walletData, error: walletError },
        { data: profileData, error: profileError },
        { data: orderData, error: orderError },
        { data: payoutData, error: payoutError },
      ] = await Promise.all([
        supabase
          .from("wallets")
          .select("*")
          .eq("user_id", userId)
          .single(),

        supabase
          .from("profiles")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("id", userId)
          .single(),

        supabase
          .from("orders")
          .select("id, completed_at, seller_net_cents, listing_snapshot")
          .eq("seller_id", userId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),

        supabase
          .from("payouts")
          .select("id, net_cents, created_at, status")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ])

      if (walletError) throw walletError
      if (profileError) throw profileError
      if (orderError) throw orderError
      if (payoutError) throw payoutError

      setWallet(walletData)
      setProfile(profileData)
      setOrders(orderData || [])
      setPayouts(payoutData || [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load wallet.",
      })
    } finally {
      setLoading(false)
    }
  }

  const available = (wallet?.available_balance_cents ?? 0) / 100
  const pending = (wallet?.pending_balance_cents ?? 0) / 100

  const numericAmount =
    Number(rawAmount.replace(/[^0-9]/g, "")) / 100

  const formattedAmount = `$${numericAmount.toFixed(2)}`
  const isValidAmount =
    numericAmount > 0 && numericAmount <= available

  const handlePayoutSetup = async () => {
    try {
      setRedirecting(true)

      const { data, error } = await supabase.functions.invoke(
        "create-connect-account-link",
        {
          body: {
            user_id: userId,
            email: session?.user?.email,
          },
        }
      )

      if (error) throw error

      const onboardingUrl = data?.url ?? data?.data?.url

      if (!onboardingUrl) {
        Alert.alert("Error", "Failed to open Stripe onboarding")
        return
      }

      await Linking.openURL(onboardingUrl)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to open Stripe onboarding.",
      })
    } finally {
      setRedirecting(false)
    }
  }

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true)

      const { error } = await supabase.functions.invoke(
        "execute-withdrawal",
        {
          body: {
            user_id: userId,
            amount_cents: Math.round(numericAmount * 100),
            payout_type: "standard",
          },
        }
      )

      if (error) throw error

      Alert.alert(
        "Success",
        "Your payout is on the way."
      )

      setRawAmount("")
      loadData()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Withdrawal failed.",
      })
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading || !wallet) {
    return (
      <View style={styles.screen}>
        <GlobalHeader />
        <ActivityIndicator style={{ marginTop: 80 }} />
        <GlobalFooter />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Wallet</Text>

        <View style={styles.walletHero}>
  <Text style={styles.walletHeroLabel}>
    Available Balance
  </Text>

  <Text style={styles.walletHeroAmount}>
    ${available.toFixed(2)}
  </Text>

  <View style={styles.pendingRow}>
    <Ionicons
      name="time-outline"
      size={16}
      color="#FFF7ED"
    />

    <Text style={styles.pendingText}>
      ${pending.toFixed(2)} pending
    </Text>
  </View>
</View>

        {/* TABS */}
        <View style={styles.tabs}>
          {(["overview", "withdraw", "payouts"] as TabKey[]).map(
            (item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.tabBtn,
                  tab === item && styles.tabBtnActive,
                ]}
                onPress={() => setTab(item)}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === item && styles.tabTextActive,
                  ]}
                >
                  {item.charAt(0).toUpperCase() +
                    item.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Recent Sales
            </Text>

            {orders.map((order) => {
              const listing = parseListingSnapshot(
                order.listing_snapshot
              )

              return (
                <View
                  key={order.id}
                  style={styles.row}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconBubble}>
                      <Ionicons
                        name="cube-outline"
                        size={18}
                        color="#6B7280"
                      />
                    </View>

                    <View>
                      <Text style={styles.rowTitle}>
                        {listing?.title || "Sale"}
                      </Text>

                      <Text style={styles.rowSub}>
                        {new Date(
                          order.completed_at
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.rowAmount}>
                    +$
                    {(
                      order.seller_net_cents / 100
                    ).toFixed(2)}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* WITHDRAW */}
        {tab === "withdraw" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Withdraw Funds
            </Text>

            {!(
  profile?.stripe_account_id &&
  profile?.stripe_onboarding_complete
) ? (
  <TouchableOpacity
    style={styles.primaryBtn}
    onPress={handlePayoutSetup}
  >
    <Text style={styles.primaryBtnText}>
      {profile?.stripe_account_id
        ? "Complete Payout Setup"
        : "Set Up Payout Method"}
    </Text>
  </TouchableOpacity>
) : (
              <>
                <TextInput
                  value={formattedAmount}
                  onChangeText={setRawAmount}
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (!isValidAmount ||
                      withdrawing) && {
                      opacity: 0.5,
                    },
                  ]}
                  disabled={
                    !isValidAmount || withdrawing
                  }
                  onPress={handleWithdraw}
                >
                  <Text style={styles.primaryBtnText}>
                    {withdrawing
                      ? "Processing..."
                      : "Withdraw Funds"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* PAYOUTS */}
        {tab === "payouts" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Payout History
            </Text>

            {payouts.map((payout) => (
              <View
                key={payout.id}
                style={styles.row}
              >
                <View>
                  <Text style={styles.rowTitle}>
                    Payout
                  </Text>
                  <Text style={styles.rowSub}>
                    {new Date(
                      payout.created_at
                    ).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={styles.rowAmount}>
                  $
                  {(payout.net_cents / 100).toFixed(
                    2
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <GlobalFooter />

      {redirecting && (
        <Modal transparent>
          <View style={styles.overlay}>
            <ActivityIndicator
              size="large"
              color="#FFF"
            />
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F6F4" },
  content: { padding: 18, paddingBottom: 120 },

  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 20,
    color: "#111827",
  },

  walletHero: {
  backgroundColor: "#E2843B",
  borderRadius: 28,
  padding: 28,
  marginBottom: 24,
},

walletHeroLabel: {
  fontSize: 16,
  fontWeight: "700",
  color: "#FFF7ED",
},

walletHeroAmount: {
  marginTop: 10,
  fontSize: 52,
  fontWeight: "900",
  color: "#FFFFFF",
},

pendingRow: {
  marginTop: 16,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},

pendingText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#FFF7ED",
},

  tabs: {
    flexDirection: "row",
    backgroundColor: "#ECECEC",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  tabBtnActive: {
    backgroundColor: "#FFF",
  },

  tabText: {
    color: "#6B7280",
    fontWeight: "600",
  },

  tabTextActive: {
    color: "#111827",
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 18,
    color: "#111827",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  rowSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },

  rowAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#22C55E",
  },

  primaryBtn: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },

  primaryBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 18,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.55)",
    alignItems: "center",
    justifyContent: "center",
  },
})