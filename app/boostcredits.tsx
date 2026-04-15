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
  accent?: "boost" | "mega"
}

const BOOST_PACKS: Pack[] = [
  {
    id: "boost_pack_3",
    title: "Starter Pack",
    subtitle: "3 Boosts • 7 days each",
    accent: "boost",
  },
  {
    id: "boost_pack_10",
    title: "Growth Pack",
    subtitle: "10 Boosts • 7 days each",
    badge: "Most Popular",
    accent: "boost",
  },
  {
    id: "boost_pack_25",
    title: "Power Pack",
    subtitle: "25 Boosts • 7 days each",
    badge: "Best Value",
    accent: "boost",
  },
]

const MEGA_PACKS: Pack[] = [
  {
    id: "mega_boost_1",
    title: "Mega Boost",
    subtitle: "1 Mega • 14 days",
    accent: "mega",
  },
  {
    id: "mega_boost_3",
    title: "Mega Pack",
    subtitle: "3 Megas • 14 days each",
    badge: "Most Popular",
    accent: "mega",
  },
  {
    id: "mega_boost_8",
    title: "Mega Pro Pack",
    subtitle: "8 Megas • 14 days each",
    badge: "Best Value",
    accent: "mega",
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

        {[...BOOST_PACKS, ...MEGA_PACKS].map(
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
            Boost Protection Included
          </Text>

          <Text style={styles.refundText}>
            All boost credits are refunded
            back to your account if the
            boosted listing does not sell
            during the boost period.
            Reuse them until the item sells.
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