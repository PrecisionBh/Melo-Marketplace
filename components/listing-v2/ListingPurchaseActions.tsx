import { Ionicons } from "@expo/vector-icons"
import {
  ActivityIndicator, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"

export default function ListingPurchaseActions({
  isSeller,
  allowOffers,

  quantity,
  setQuantity,
  maxQuantity,

  // 🔥 NEW
  sizes,
  selectedSize,
  setSelectedSize,

  following,
  onToggleFollow,

  offerAmount,
  setOfferAmount,
  offerMessage,
  setOfferMessage,

  onBuyNow,
  onAddToCart,
  onMakeOffer,
  onMessageSeller,
  sendingOffer = false,
}: {
  isSeller: boolean
  allowOffers: boolean

  quantity: number
  setQuantity: (qty: number) => void
  maxQuantity: number

  // 🔥 NEW TYPES
  sizes?: { size: string; qty: number | string }[]
  selectedSize?: string | null
  setSelectedSize?: (val: string) => void

  following: boolean
  onToggleFollow: () => void

  offerAmount: string
  setOfferAmount: (val: string) => void
  offerMessage: string
  setOfferMessage: (val: string) => void

  onBuyNow: () => void
  onAddToCart: () => void
  onMakeOffer: () => void
  onMessageSeller: () => void
  sendingOffer?: boolean
}) {
  if (isSeller) return null

  const hasSizes = sizes && sizes.length > 0

  return (
    <View style={styles.wrap}>
      {/* 🔥 SIZE SELECTOR */}
      {hasSizes && (
        <>
          <Text style={styles.sectionLabel}>Size</Text>

          <View style={styles.sizeWrap}>
            {sizes.map((s) => (
              <TouchableOpacity
                key={s.size}
                onPress={() => setSelectedSize?.(s.size)}
                style={[
                  styles.sizePill,
                  selectedSize === s.size &&
                    styles.sizePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.sizeText,
                    selectedSize === s.size &&
                      styles.sizeTextActive,
                  ]}
                >
                  {s.size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* 🔥 QUANTITY */}
      <Text style={styles.sectionLabel}>Quantity</Text>

      <View style={styles.qtyRow}>
        <QtyBtn
          icon="remove"
          onPress={() =>
            setQuantity(Math.max(1, quantity - 1))
          }
        />

        <TextInput
  style={styles.qtyInput}
  value={String(quantity)}
  onChangeText={(text) => {
    const num = parseInt(text || "1", 10)

    if (isNaN(num)) {
      setQuantity(1)
      return
    }

    setQuantity(
      Math.min(
        Math.max(1, num),
        maxQuantity
      )
    )
  }}
  keyboardType="number-pad"
/>

        <QtyBtn
          icon="add"
          onPress={() =>
            setQuantity(
              Math.min(maxQuantity, quantity + 1)
            )
          }
        />

        <Text style={styles.available}>
          {maxQuantity} available
        </Text>
      </View>

      {/* Follow Seller */}
      <TouchableOpacity
        style={[
          styles.followBtn,
          following && styles.followingBtn,
        ]}
        onPress={onToggleFollow}
      >
        <Ionicons
          name={
            following ? "person" : "person-add"
          }
          size={18}
          color="#111"
        />
        <Text style={styles.followText}>
          {following
            ? "Following"
            : "Follow Seller"}
        </Text>
      </TouchableOpacity>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={onAddToCart}
        >
          <Ionicons
            name="cart-outline"
            size={18}
            color="#111"
          />
          <Text style={styles.cartText}>
            Add to Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buyBtn}
          onPress={onBuyNow}
        >
          <Text style={styles.buyText}>
            Buy Now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.msgBtn}
          onPress={onMessageSeller}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color="#111"
          />
        </TouchableOpacity>
      </View>

      {/* Make Offer */}
      {allowOffers && (
        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>
            Make an Offer
          </Text>

          <TextInput
            value={offerAmount}
            onChangeText={setOfferAmount}
            placeholder="Your offer amount"
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor="#333"
          />

          <TextInput
            value={offerMessage}
            onChangeText={setOfferMessage}
            placeholder="Add a message (optional)"
            multiline
            style={styles.textArea}
            placeholderTextColor="#333"
          />

          <TouchableOpacity
  style={[
    styles.sendOfferBtn,
    sendingOffer && { opacity: 0.6 },
  ]}
  onPress={onMakeOffer}
  disabled={sendingOffer}
>
  {sendingOffer ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.sendOfferText}>
      Send Offer
    </Text>
  )}
</TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function QtyBtn({
  icon,
  onPress,
}: {
  icon: "add" | "remove"
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.qtyBtn}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color="#111"
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 32,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },

  sizeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  sizePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eee",
  },

  sizePillActive: {
    backgroundColor: "#D97732",
  },

  sizeText: {
    fontWeight: "700",
    color: "#111",
  },

  sizeTextActive: {
    color: "#fff",
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  qtyBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },

  qtyValue: {
    width: 50,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
  },

  available: {
    marginLeft: 14,
    fontSize: 14,
    color: "#777",
  },

  followBtn: {
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  followingBtn: {
    borderColor: "#D97732",
    backgroundColor: "#FFF7ED",
  },

  followText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },

  cartBtn: {
    flex: 1.25,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  cartText: {
    fontWeight: "700",
    fontSize: 15,
    color: "#111",
  },

  buyBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#D97732",
    alignItems: "center",
    justifyContent: "center",
  },

  buyText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  msgBtn: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },

  offerCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
  },

  offerTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
    color: "#111",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 15,
    color: "#000",
  },

  qtyInput: {
  width: 60,
  textAlign: "center",
  fontSize: 22,
  fontWeight: "800",
  color: "#111",
},

  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    minHeight: 90,
    marginBottom: 14,
    fontSize: 15,
    color: "#000",
  },

  sendOfferBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#D97732",
    alignItems: "center",
    justifyContent: "center",
  },

  sendOfferText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
})