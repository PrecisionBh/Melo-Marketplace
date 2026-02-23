import { useLocalSearchParams } from "expo-router"
import { StyleSheet, View } from "react-native"

import AppHeader from "@/components/app-header"
import DisputeDetailCard from "@/components/disputes/DisputeDetailCard"

/**
 * 🚨 MELO ARCHITECTURE RULE
 * This page MUST use the REAL dispute UUID from the route.
 * NEVER the 6-digit Melo display number.
 *
 * Header = Global
 * Dispute Logic = DisputeDetailCard (single source of truth)
 */
export default function BuyerDisputeDetailPage() {
  const params = useLocalSearchParams()

  /**
   * Expo Router params are:
   * string | string[] | undefined
   * We safely normalize to a real UUID string.
   */
  const rawId = params.id

  const disputeId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : null

  // 🛑 Safety guard (prevents crashes + bad DB queries)
  if (!disputeId) {
    return null
  }

  return (
    <View style={styles.screen}>
      {/* 🌿 Global Melo Header (handles navigation/back automatically) */}
      <AppHeader title="Dispute Details" />

      {/* 🔥 Shared dispute engine (BUYER MODE) */}
      <DisputeDetailCard
        disputeId={disputeId}
        role="buyer"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF", // Melo theme background
  },
})