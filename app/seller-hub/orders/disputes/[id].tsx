import { useLocalSearchParams } from "expo-router"
import { StyleSheet, View } from "react-native"

import AppHeader from "@/components/app-header"
import DisputeDetailCard from "@/components/disputes/DisputeDetailCard"

/**
 * 🚨 MELO ARCHITECTURE RULE
 * This page uses the REAL dispute UUID from the route.
 * NOT the 6-digit Melo display number.
 *
 * Header = Global
 * Logic = DisputeDetailCard component
 */
export default function SellerDisputeDetailPage() {
  const params = useLocalSearchParams()

  /**
   * Expo Router params are:
   * string | string[] | undefined
   * We MUST normalize safely to a real string UUID.
   */
  const rawId = params.id

  const disputeId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : null

  // 🛑 Safety guard (prevents crashes + bad queries)
  if (!disputeId) {
    return null
  }

  return (
    <View style={styles.screen}>
      {/* 🌿 Global Melo Header (handles back automatically) */}
      <AppHeader title="Dispute Details" />

      {/* 🔥 Reusable dispute component (seller role) */}
      <DisputeDetailCard
        disputeId={disputeId}
        role="seller"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF", // matches your Seller Hub theme
  },
})