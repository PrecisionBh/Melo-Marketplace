import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import BuyerActions from "@/components/orders/BuyerActions"
import OrderStepIndicator from "@/components/orders/OrderStepIndicator"
import OrderSummaryCard from "@/components/orders/OrderSummaryCard"
import RefundSection from "@/components/orders/RefundSection"
import ReturnActions from "@/components/orders/ReturnActions"
import SellerShippingActions from "@/components/orders/SellerShippingActions"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    View,
} from "react-native"

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  const loadOrder = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error

      setOrder(data)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load order.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!order) return null

  const userId = session?.user?.id
  const isBuyer = order.buyer_id === userId
  const isSeller = order.seller_id === userId

  const isReturnFlow =
    order.status === "return_started" ||
    order.status === "return_processing"

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <OrderSummaryCard order={order} />

        <OrderStepIndicator
  order={order}
  role={isSeller ? "seller" : "buyer"}
/>

        {isSeller && (
          <SellerShippingActions
            order={order}
            refreshOrder={loadOrder}
          />
        )}

        {isBuyer && (
          <BuyerActions
            order={order}
            refreshOrder={loadOrder}
          />
        )}

        {isReturnFlow && (
          <ReturnActions
            order={order}
            refreshOrder={loadOrder}
          />
        )}

        {isSeller &&
          order.return_received && (
            <RefundSection
              order={order}
              refreshOrder={loadOrder}
            />
          )}
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

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },
})