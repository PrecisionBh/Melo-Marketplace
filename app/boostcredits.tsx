import BoostBalanceCard from "@/components/boost/BoostBalanceCard"
import BoostHeroCard from "@/components/boost/BoostHeroCard"
import BoostPackCard from "@/components/boost/BoostPackCard"
import BoostPurchaseErrorModal from "@/components/boost/BoostPurchaseErrorModal"
import BoostPurchaseSuccessModal from "@/components/boost/BoostPurchaseSuccessModal"
import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { getOfferings } from "@/lib/revenuecat"
import { supabase } from "@/lib/supabase"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Purchases from "react-native-purchases"

type Pack = {
  id: string
  title: string
  subtitle: string
  badge?: string
  accent?: "boost"
}

const BOOST_PACKS: Pack[] = [
  {
    id: "boost_pack_3",
    title: "Get Seen Faster",
    subtitle:
      "3 Listing Boosts • Push your items higher in the feed for 7 full days each.",
    accent: "boost",
  },

  {
    id: "boost_pack_10",
    title: "Seller Growth Pack",
    subtitle:
      "10 Listing Boosts • Great for active sellers wanting more profile traffic, likes, and buyers.",
    accent: "boost",
  },

  {
    id: "boost_pack_25",
    title: "Full Store Exposure",
    subtitle:
      "25 Listing Boosts • Keep your inventory constantly circulating through the marketplace feed.",
    accent: "boost",
  },
]

export default function BoostCreditsScreen() {
  const router = useRouter()

  const [userId, setUserId] =
    useState<string | null>(null)

  const [boostsRemaining, setBoostsRemaining] =
    useState(0)

  const [megaRemaining, setMegaRemaining] =
    useState(0)

  const [rcPackages, setRcPackages] =
    useState<any[]>([])

  const [buyingId, setBuyingId] =
    useState<string | null>(null)

  const [successVisible, setSuccessVisible] =
    useState(false)

  const [errorVisible, setErrorVisible] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState("")

  const getPriceForPack = (
    packId: string
  ) => {
    const pkg = rcPackages.find(
      (p) =>
        p.product.identifier === packId
    )

    return (
      pkg?.product?.priceString ?? ""
    )
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) return

      setUserId(user.id)

      const { data } = await supabase
        .from("profiles")
        .select(
          "boosts_remaining, mega_boosts_remaining"
        )
        .eq("id", user.id)
        .single()

      setBoostsRemaining(
        data?.boosts_remaining ?? 0
      )

      setMegaRemaining(
        data?.mega_boosts_remaining ?? 0
      )

      const offering =
        await getOfferings()

      if (offering) {
        setRcPackages(
          offering.availablePackages
        )
      }
    } catch {
      setErrorMessage(
        "Failed to load boost store."
      )
      setErrorVisible(true)
    }
  }

  const handleBuyPack = async (
    packId: string
  ) => {
    if (!userId) {
      router.push("/login")
      return
    }

    try {
      setBuyingId(packId)

      const selectedPackage =
        rcPackages.find(
          (pkg) =>
            pkg.product.identifier ===
            packId
        )

      if (!selectedPackage) {
        throw new Error(
          "Product not loaded."
        )
      }

      const { customerInfo } =
        await Purchases.purchasePackage(
          selectedPackage
        )

      await supabase.functions.invoke(
        "grant-purchase",
        {
          body: {
            productId: packId,
            customerInfo,
          },
        }
      )

      await loadData()

      setSuccessVisible(true)
    } catch (e: any) {
      if (!e?.userCancelled) {
        setErrorMessage(
          e?.message ??
            "Purchase failed."
        )
        setErrorVisible(true)
      }
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <BoostHeroCard />

        <BoostBalanceCard
          boostsRemaining={
            boostsRemaining
          }
          megaRemaining={
            megaRemaining
          }
        />

        {BOOST_PACKS.map(
          (pack) => (
            <BoostPackCard
              key={pack.id}
              pack={pack}
              price={getPriceForPack(
                pack.id
              )}
              loading={
                buyingId === pack.id
              }
              onPress={() =>
                handleBuyPack(pack.id)
              }
            />
          )
        )}

        <View style={styles.refundNotice}>
  <Text style={styles.refundTitle}>
    🚀 Why Sellers Use Boosts
  </Text>

  <Text style={styles.refundText}>
    Boosted listings are shown higher in
    the marketplace feed, helping more
    buyers discover your items faster.
    Great for limited drops, high-value
    items, or listings that deserve more
    visibility.
  </Text>

  <View style={styles.divider} />

  <Text style={styles.refundTitle}>
    ♻️ Boost Protection
  </Text>

  <Text style={styles.refundText}>
    If your boosted listing does not sell
    during the boost period, your boost
    credit is automatically returned to
    your account so you can use it again.
  </Text>
</View>
      </ScrollView>

      <GlobalFooter />

      <BoostPurchaseSuccessModal
        visible={successVisible}
        onClose={() =>
          setSuccessVisible(false)
        }
      />

      <BoostPurchaseErrorModal
        visible={errorVisible}
        message={errorMessage}
        onClose={() =>
          setErrorVisible(false)
        }
      />
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
    paddingBottom: 140,
  },

  refundNotice: {
    marginTop: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 22,
    padding: 18,
  },

  divider: {
  height: 1,
  backgroundColor: "#FED7AA",
  marginVertical: 14,
},

  refundTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C2410C",
    marginBottom: 8,
  },

  refundText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#9A3412",
  },
})