import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import ProManageCard from "@/components/pro/ProManageCard"
import ProUpgradeCard from "@/components/pro/ProUpgradeCard"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { getOfferings } from "@/lib/revenuecat"
import { supabase } from "@/lib/supabase"

import Purchases from "react-native-purchases"

import { useEffect, useState } from "react"
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function MeloProScreen() {
  const { session } = useAuth()

  const [loading, setLoading] =
    useState(false)

  const [isPro, setIsPro] =
    useState(false)

  const [rcPackage, setRcPackage] =
    useState<any>(null)

  const [price, setPrice] =
    useState("$24.99")

  useEffect(() => {
    loadProfile()
    loadRevenueCat()
  }, [])

  const loadProfile = async () => {
    try {
      const userId =
        session?.user?.id

      if (!userId) return

      const { data } =
        await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", userId)
          .single()

      setIsPro(!!data?.is_pro)
    } catch (err) {
      console.error(
        "Profile load failed:",
        err
      )
    }
  }

  const loadRevenueCat =
    async () => {
      try {
        const offering =
          await getOfferings()

        if (!offering) return

        const proPackage =
          offering.availablePackages.find(
            (pkg) =>
              pkg.product.identifier.includes(
                "melo_pro_subscription"
              )
          )

        if (!proPackage) return

        setRcPackage(proPackage)
        setPrice(
          proPackage.product.priceString
        )
      } catch (err) {
        console.error(
          "RevenueCat load error:",
          err
        )
      }
    }

  const handleSubscribe =
    async () => {
      try {
        if (!rcPackage) {
          throw new Error(
            "Subscription not loaded"
          )
        }

        setLoading(true)

        const { customerInfo } =
          await Purchases.purchasePackage(
            rcPackage
          )

        const active =
          customerInfo.entitlements
            .active[
            "melo_marketplace_pro"
          ]

        if (!active) {
          throw new Error(
            "Entitlement missing"
          )
        }

        await supabase.functions.invoke(
          "grant-purchase",
          {
            body: {
              productId:
                "melo_pro_subscription",
              customerInfo,
            },
          }
        )

        Alert.alert(
          "Success",
          "You're now Melo Pro 🎉"
        )

        await loadProfile()
      } catch (err: any) {
        if (!err?.userCancelled) {
          handleAppError(err, {
            fallbackMessage:
              "Unable to subscribe.",
          })
        }
      } finally {
        setLoading(false)
      }
    }

  const handleManageSubscription =
    async () => {
      try {
        const url =
          Platform.OS === "ios"
            ? "https://apps.apple.com/account/subscriptions"
            : "https://play.google.com/store/account/subscriptions"

        await Linking.openURL(url)
      } catch {
        Alert.alert(
          "Error",
          "Unable to open subscription manager."
        )
      }
    }

  const handleRestore =
    async () => {
      try {
        const customerInfo =
          await Purchases.restorePurchases()

        await supabase.functions.invoke(
          "grant-purchase",
          {
            body: {
              productId:
                "melo_pro_subscription",
              customerInfo,
            },
          }
        )

        Alert.alert(
          "Restored",
          "Purchases restored successfully."
        )

        await loadProfile()
      } catch {
        Alert.alert(
          "Error",
          "Failed to restore purchases."
        )
      }
    }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <Text style={styles.pageTitle}>
          Melo Pro
        </Text>

        {isPro ? (
          <ProManageCard
            onManage={
              handleManageSubscription
            }
          />
        ) : (
          <ProUpgradeCard
            price={price}
            loading={loading}
            onSubscribe={
              handleSubscribe
            }
          />
        )}

        <TouchableOpacity
          onPress={handleRestore}
        >
          <Text style={styles.link}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://www.melomarketplace.app/legal?tab=terms"
            )
          }
        >
          <Text style={styles.link}>
            Terms of Use
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://www.melomarketplace.app/legal?tab=privacy"
            )
          }
        >
          <Text style={styles.link}>
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
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 24,
  },

  link: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
})