import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { getOfferings } from "@/lib/revenuecat"
import { supabase } from "@/lib/supabase"

import Purchases from "react-native-purchases"

export default function MeloProCheckoutScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [loading, setLoading] = useState(false)
  const [rcPackage, setRcPackage] = useState<any>(null)
  const [price, setPrice] = useState("$24.99")

  useEffect(() => {
    const load = async () => {
      try {
        const offering = await getOfferings()
        if (!offering) return

        const proPackage = offering.availablePackages.find(
          (pkg) =>
            pkg.product.identifier.includes(
              "melo_pro_subscription"
            )
        )

        if (!proPackage) return

        setRcPackage(proPackage)
        setPrice(proPackage.product.priceString)
      } catch (err) {
        console.error("RevenueCat load error:", err)
      }
    }

    load()
  }, [])

  const handleSubscribe = async () => {
    if (!session?.user?.id) {
      Alert.alert(
        "Sign in required",
        "Please log in to upgrade to Melo Pro."
      )
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      if (!rcPackage) throw new Error("Subscription not loaded")

      const { customerInfo } =
        await Purchases.purchasePackage(rcPackage)

      const isPro =
        customerInfo.entitlements.active[
          "melo_marketplace_pro"
        ]

      if (isPro) {
        await supabase.functions.invoke("grant-purchase", {
          body: {
            productId: "melo_pro_subscription",
            customerInfo,
          },
        })

        Alert.alert("Success", "You're now Melo Pro 🎉")
        router.replace("/profile")
      } else {
        throw new Error("Entitlement not active")
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        handleAppError(err, {
          fallbackMessage:
            "Unable to complete purchase.",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    try {
      const customerInfo =
        await Purchases.restorePurchases()

      await supabase.functions.invoke("grant-purchase", {
        body: {
          productId: "melo_pro_subscription",
          customerInfo,
        },
      })

      Alert.alert(
        "Restored",
        "Your purchases have been restored"
      )
    } catch {
      Alert.alert(
        "Error",
        "Failed to restore purchases"
      )
    }
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Ionicons
            name="star-outline"
            size={16}
            color="#D97732"
          />
          <Text style={styles.badgeText}>Melo Pro</Text>
        </View>

        <Text style={styles.heading}>
          Sell more. Keep more.
        </Text>

        <Text style={styles.subheading}>
          Upgrade to Melo Pro and reduce seller fees
          while unlocking unlimited listings.
        </Text>

        <View style={styles.pricingCard}>
          <View style={styles.topAccent} />

          <View style={styles.priceHeader}>
            <Ionicons
              name="flash-outline"
              size={18}
              color="#D97732"
            />
            <Text style={styles.planName}>Melo Pro</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>
              {price.replace(".99", "")}
            </Text>
            <Text style={styles.priceDecimal}>
              .99
            </Text>
            <Text style={styles.perMonth}>
              /month
            </Text>
          </View>

          <Text style={styles.monthlyText}>
            Billed monthly. Cancel anytime.
          </Text>

          <View style={styles.features}>
            {[
              "1% seller fee per sale",
              "Unlimited active listings",
              "Melo Pro badge on profile",
              "Priority support",
              "Advanced analytics coming soon",
              "Early access to new features",
            ].map((feature) => (
              <View
                key={feature}
                style={styles.featureRow}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#22C55E"
                />
                <Text style={styles.featureText}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.subscribeBtn,
              loading && { opacity: 0.7 },
            ]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name="rocket-outline"
                  size={18}
                  color="#FFF"
                />
                <Text style={styles.subscribeText}>
                  Subscribe to Melo Pro
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleRestore}
        >
          <Text style={styles.restore}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.restore}>
            Manage Subscription
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/legal/terms")}
        >
          <Text style={styles.restore}>
            Terms of Use
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push("/legal/privacy")
          }
        >
          <Text style={styles.restore}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  content: {
    padding: 20,
    paddingBottom: 120,
  },

  badge: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF4E8",
    marginBottom: 18,
  },

  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D97732",
  },

  heading: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    color: "#111827",
  },

  subheading: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 28,
  },

  pricingCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#E9D6C7",
    padding: 24,
    overflow: "hidden",
  },

  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#D97732",
  },

  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },

  planName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  priceMain: {
    fontSize: 52,
    fontWeight: "900",
    color: "#111827",
  },

  priceDecimal: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#6B7280",
  },

  perMonth: {
    fontSize: 16,
    marginBottom: 10,
    marginLeft: 4,
    color: "#6B7280",
  },

  monthlyText: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 22,
  },

  features: {
    gap: 14,
    marginBottom: 24,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  featureText: {
    fontSize: 15,
    color: "#111827",
  },

  subscribeBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#D97732",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  subscribeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  },

  restore: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
})