import { useLocalSearchParams } from "expo-router"
import { View } from "react-native"

import AppHeader from "@/components/app-header"
import DisputeIssueForm from "@/components/disputes/DisputeIssueForm"

/**
 * 🚨 MELO ARCHITECTURE RULES
 * - Always use REAL order UUID from route
 * - Never use Melo 6-digit display number
 * - Seller disputes ONLY during `return_started`
 * - Header is owned by the page, NOT the form component
 */

export default function SellerDisputeIssuePage() {
  const params = useLocalSearchParams()

  // Expo Router params: string | string[] | undefined
  const rawId = params.id

  const orderId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : null

  // Prevent crash + bad DB calls
  if (!orderId) {
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#EAF4EF" }}>
      {/* 🔥 Manual Header (matches your Seller Hub pages) */}
      <AppHeader
        title="File a Seller Dispute"
        backRoute={`/seller-hub/orders/${orderId}`}
      />

      {/* 🔥 Unified Dispute Engine (role = seller) */}
      <DisputeIssueForm
        orderId={orderId} // REAL UUID ONLY
        role="seller"
        title="File a Seller Dispute"
      />
    </View>
  )
}