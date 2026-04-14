import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function ProfileWalletCard() {
  const router = useRouter()
  const { session } = useAuth()

  const userId = session?.user?.id

  const [balanceCents, setBalanceCents] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadWallet()
  }, [userId])

  const loadWallet = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("wallets")
        .select("available_balance_cents")
        .eq("user_id", userId)
        .single()

      if (error) throw error

      setBalanceCents(data?.available_balance_cents ?? 0)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load wallet balance.",
        context: "profile-wallet-load",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => router.push("/wallet")}
    >
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="wallet-outline"
            size={22}
            color="#D97732"
          />
        </View>

        <View>
          <Text style={styles.label}>
            Available Balance
          </Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#D97732"
              style={{ marginTop: 6 }}
            />
          ) : (
            <Text style={styles.balance}>
              $
              {(balanceCents / 100).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.walletText}>Wallet</Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#D97732"
        />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: "#F8F1EA",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E9D6C7",
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#F3E4D8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },

  balance: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  walletText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D97732",
  },
})