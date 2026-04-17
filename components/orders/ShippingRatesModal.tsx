import { useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  visible: boolean
  rates: any[]
  onClose: () => void
  onPurchase: (rate: any) => void
  loading?: boolean
  isReturn?: boolean // 🔥 NEW
}

// 🔥 FORMAT FUNCTION
const formatServiceName = (rate: any) => {
  const carrier =
    rate.carrier === "UPSDAP" ? "UPS" : rate.carrier

  let service = rate.service || ""
  const lower = service.toLowerCase()

  if (lower.includes("ground")) {
    service = "Ground"
  } else if (lower.includes("2nd")) {
    service = "2-Day"
  } else if (lower.includes("next")) {
    service = "Next Day"
  } else if (lower.includes("priority")) {
    service = "Priority"
  }

  return `${carrier} ${service}`.trim()
}

export default function ShippingRatesModal({
  visible,
  rates,
  onClose,
  onPurchase,
  loading,
  isReturn = false, // 🔥 NEW
}: Props) {
  const [selectedRate, setSelectedRate] =
    useState<any | null>(null)

  if (!visible) return null

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* HEADER */}
        <Text style={styles.title}>
          {isReturn
            ? "Select Return Shipping"
            : "Select Shipping"}
        </Text>

        <Text style={styles.sub}>
          {isReturn
            ? "We recommend using a Melo return label for faster processing and protected returns."
            : "Choose the best rate. Cost is deducted from your payout."}
        </Text>

        {/* 🔥 RETURN WARNING */}
        {isReturn && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ You must ship your return within{" "}
              <Text style={styles.bold}>
                72 hours
              </Text>
              .
            </Text>
            <Text style={styles.warningText}>
              If not shipped, the return will be cancelled and escrow will be released to the seller.
            </Text>
          </View>
        )}

        {/* RATES */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {rates.map((rate, i) => {
            const isSelected =
              selectedRate?.rate_id === rate.rate_id

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                style={[
                  styles.rateRow,
                  isSelected && styles.rateSelected,
                ]}
                onPress={() => setSelectedRate(rate)}
              >
                {/* LEFT */}
                <View style={styles.leftContent}>
                  <Text
                    style={styles.carrier}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatServiceName(rate)}
                  </Text>

                  {rate.delivery_days && (
                    <Text style={styles.subText}>
                      {rate.delivery_days}-day delivery
                    </Text>
                  )}
                </View>

                {/* RIGHT */}
                <Text style={styles.price}>
                  {rate.display_price}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.purchaseBtn,
              !selectedRate && styles.disabledBtn,
            ]}
            disabled={!selectedRate || loading}
            onPress={() =>
              selectedRate && onPurchase(selectedRate)
            }
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.purchaseText}>
                {isReturn
                  ? "Purchase Return Label"
                  : "Purchase Label"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  card: {
    width: "100%",
    maxHeight: "65%",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  sub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 12,
  },

  warningBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  warningText: {
    fontSize: 12,
    color: "#92400E",
    marginBottom: 4,
  },

  bold: {
    fontWeight: "800",
  },

  list: {
    flexGrow: 0,
    marginBottom: 10,
  },

  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },

  rateSelected: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#D97732",
  },

  leftContent: {
    flex: 1,
    marginRight: 12,
    maxWidth: "75%",
  },

  carrier: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  subText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#D97732",
    minWidth: 70,
    textAlign: "right",
  },

  footer: {
    marginTop: 6,
  },

  purchaseBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  disabledBtn: {
    backgroundColor: "#E5E7EB",
  },

  purchaseText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  cancelBtn: {
    marginTop: 10,
    alignItems: "center",
  },

  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
})