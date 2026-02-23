import { useLocalSearchParams } from "expo-router"
import { View } from "react-native"

import AppHeader from "@/components/app-header"
import DisputeIssueForm from "@/components/disputes/DisputeIssueForm"

/**
 * 🚨 IMPORTANT (MELO ARCHITECTURE)
 * We NEVER use the 6-digit Melo display number here.
 * The dispute system MUST use the real UUID from the route.
 */

export default function BuyerDisputeIssuePage() {
  const params = useLocalSearchParams()

  /**
   * Expo Router params are ALWAYS:
   * string | string[] | undefined
   * Normalize safely to real UUID string.
   */
  const rawId = params.id

  const orderId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : null

  // Safety guard (prevents crash + TS errors)
  if (!orderId) {
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#EAF4EF" }}>
      {/* 🔥 Manual Header (matches your Buyer Hub architecture) */}
      <AppHeader
        title="File a Dispute"
        backRoute={`/buyer-hub/orders/${orderId}`}
      />

      <DisputeIssueForm
        orderId={orderId} // 🔥 REAL UUID (NOT Melo display number)
        role="buyer"
        title="File a Dispute"
      />
    </View>
  )
}