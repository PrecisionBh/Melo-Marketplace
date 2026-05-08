// components/orders/OrderButtons.tsx

import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type Props = {
  order: any
}

export default function OrderButtons({
  order,
}: Props) {
  const router = useRouter()

  const { session } = useAuth()

  // 🔥 SUPPORT BOTH OLD + SNAPSHOT STRUCTURE
  const listingId =
    order?.listing_snapshot?.listing_id ||
    order?.listing_id

  // 🔥 SAFETY
  if (!listingId) {
    console.log(
      "❌ No listing ID found on order"
    )

    return null
  }

  const openConversation = async () => {
    try {
      if (!session?.user?.id) return

      const currentUserId =
        session.user.id

      const otherUserId =
        currentUserId === order.buyer_id
          ? order.seller_id
          : order.buyer_id

      // 🔥 CHECK EXISTING CONVERSATION
      const { data: existing } =
        await supabase
          .from("conversations")
          .select("id")
          .or(
            `and(user_one.eq.${currentUserId},user_two.eq.${otherUserId}),and(user_one.eq.${otherUserId},user_two.eq.${currentUserId})`
          )
          .maybeSingle()

      // 🔥 FOUND EXISTING
      if (existing?.id) {
        router.push({
          pathname: "/messages/[id]",
          params: {
            id: existing.id,
            listingId,
          },
        })

        return
      }

      // 🔥 CREATE NEW
      const { data, error } =
        await supabase
          .from("conversations")
          .insert({
            user_one: currentUserId,
            user_two: otherUserId,
          })
          .select("id")
          .single()

      if (error) throw error

      router.push({
        pathname: "/messages/[id]",
        params: {
          id: data.id,
          listingId,
        },
      })
    } catch (err) {
      console.log(
        "❌ Failed opening conversation:",
        err
      )

      Alert.alert(
        "Error",
        "Unable to open messages right now."
      )
    }
  }

  return (
    <View style={styles.row}>
      {/* 🔥 MESSAGE */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.9}
        onPress={openConversation}
      >
        <Ionicons
          name="chatbubble-outline"
          size={18}
          color="#111827"
        />

        <Text style={styles.buttonText}>
          Message
        </Text>
      </TouchableOpacity>

      {/* 🔥 VIEW LISTING */}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.9}
        onPress={() => {
          router.push(
            `/listing/${listingId}`
          )
        }}
      >
        <Ionicons
          name="storefront-outline"
          size={18}
          color="#111827"
        />

        <Text style={styles.buttonText}>
          View Listing
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  button: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    borderRadius: 16,

    paddingVertical: 14,
  },

  buttonText: {
    marginLeft: 8,

    fontSize: 13,
    fontWeight: "700",

    color: "#111827",
  },
})