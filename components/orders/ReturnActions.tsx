import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useState } from "react"
import {
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

export default function ReturnActions({
  order,
  refreshOrder,
  onCancelReturn,
}: {
  order: any
  refreshOrder?: () => void
  onCancelReturn?: () => void
}) {
  const { session } = useAuth()

  const hasReturnTracking =
    !!order.return_tracking_number

  const isProcessing =
    order.status === "return_processing"

  const [showTrackingForm, setShowTrackingForm] =
    useState(false)

  const [carrier, setCarrier] = useState(
    order.return_carrier || "UPS"
  )

  const [trackingNumber, setTrackingNumber] =
    useState(order.return_tracking_number || "")

  const [saving, setSaving] = useState(false)

  const uploadReturnTracking = async () => {
    if (!trackingNumber.trim()) return

    try {
      setSaving(true)

      const { error } =
        await supabase.functions.invoke(
          "create-return-easypost-tracker",
          {
            body: {
              orderId: order.id,
              carrier,
              trackingNumber:
                trackingNumber.trim(),
              userId:
                session?.user?.id,
            },
          }
        )

      if (error) throw error

      setShowTrackingForm(false)

      await refreshOrder?.()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to upload return tracking.",
      })
    } finally {
      setSaving(false)
    }
  }

  const trackReturnPackage = async () => {
    if (!order.return_tracking_url) return

    await Linking.openURL(
      order.return_tracking_url
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Return Status
      </Text>

      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>
          Return In Progress
        </Text>

        <Text style={styles.noticeSub}>
          {hasReturnTracking
            ? "Return tracking has been uploaded and is currently in transit."
            : "Awaiting buyer to upload return tracking information."}
        </Text>
      </View>

      {hasReturnTracking && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={trackReturnPackage}
        >
          <Text style={styles.primaryText}>
            Track Return Package
          </Text>
        </TouchableOpacity>
      )}

      {!hasReturnTracking &&
        !showTrackingForm && (
          <>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() =>
                setShowTrackingForm(true)
              }
            >
              <Text
                style={styles.secondaryText}
              >
                Upload Return Tracking
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancelReturn}
            >
              <Text style={styles.cancelText}>
                Cancel Return
              </Text>
            </TouchableOpacity>
          </>
        )}

      {showTrackingForm && (
        <>
          <Text style={styles.label}>
            Select Carrier
          </Text>

          <View style={styles.carrierRow}>
            {[
              "UPS",
              "USPS",
              "FedEx",
              "DHL",
            ].map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.carrierPill,
                  carrier === c &&
                    styles.carrierPillActive,
                ]}
                onPress={() =>
                  setCarrier(c)
                }
              >
                <Text
                  style={[
                    styles.carrierText,
                    carrier === c &&
                      styles
                        .carrierTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Return Tracking Number"
            value={trackingNumber}
            onChangeText={setTrackingNumber}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={uploadReturnTracking}
            disabled={saving}
          >
            <Text style={styles.submitText}>
              {saving
                ? "Saving..."
                : "Submit Return Tracking"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {isProcessing && (
        <View style={styles.processingBox}>
          <Text
            style={styles.processingTitle}
          >
            Processing Return
          </Text>

          <Text
            style={styles.processingSub}
          >
            Seller is reviewing the
            returned item.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
    marginBottom: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 14,
  },

  noticeBox: {
    backgroundColor: "#FFF7F1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D97732",
    marginBottom: 4,
  },

  noticeSub: {
    fontSize: 13,
    color: "#8A5A32",
    lineHeight: 18,
  },

  primaryBtn: {
    backgroundColor: "#D97732",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  secondaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D97732",
    marginBottom: 10,
  },

  secondaryText: {
    color: "#D97732",
    fontWeight: "800",
    fontSize: 14,
  },

  cancelBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
  },

  cancelText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 14,
  },

  processingBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },

  processingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 4,
  },

  processingSub: {
    fontSize: 13,
    color: "#991B1B",
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111",
  },

  carrierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  carrierPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },

  carrierPillActive: {
    backgroundColor: "#D97732",
  },

  carrierText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  carrierTextActive: {
    color: "#fff",
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  submitBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
})