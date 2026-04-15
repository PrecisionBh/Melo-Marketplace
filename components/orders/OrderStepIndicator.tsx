import {
    StyleSheet,
    Text,
    View,
} from "react-native"

const MAIN_STEPS = [
  { key: "paid", label: "Order Placed", subBuyer: "Payment received", subSeller: "Prepare shipment" },
  { key: "shipped", label: "Shipped", subBuyer: "Your item is on the way", subSeller: "In transit to buyer" },
  { key: "delivered", label: "Delivered", subBuyer: "Delivered to you", subSeller: "Awaiting buyer action" },
  { key: "completed", label: "Completed", subBuyer: "Order complete", subSeller: "Funds released" },
]

const RETURN_STEPS = [
  { key: "delivered", label: "Delivered", subBuyer: "Delivered to you", subSeller: "Delivered to buyer" },
  { key: "return_started", label: "Return Started", subBuyer: "Return initiated", subSeller: "Buyer started return" },
  { key: "return_processing", label: "Return Processing", subBuyer: "Return in progress", subSeller: "Awaiting return completion" },
  { key: "completed", label: "Resolved", subBuyer: "Order resolved", subSeller: "Order resolved" },
]

function getStepSet(status: string) {
  if (
    status === "return_started" ||
    status === "return_processing"
  ) {
    return RETURN_STEPS
  }

  return MAIN_STEPS
}

function getCurrentStepIndex(status: string, isDisputed?: boolean) {
  if (isDisputed) return 2

  switch (status) {
    case "paid":
      return 0
    case "label_purchased":
      return 0
    case "shipped":
    case "in_transit":
      return 1
    case "delivered":
      return 2
    case "completed":
      return 3
    case "return_started":
      return 1
    case "return_processing":
      return 2
    default:
      return 0
  }
}

export default function OrderStepIndicator({
  order,
  role = "buyer",
}: {
  order: any
  role?: "buyer" | "seller"
}) {
  const steps = getStepSet(order.status)
  const currentIndex = getCurrentStepIndex(
    order.status,
    order.is_disputed
  )

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Order Progress</Text>

      <View style={styles.stepsWrap}>
        {steps.map((step, index) => {
          const isDone = index < currentIndex
          const isActive = index === currentIndex

          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={styles.leftRail}>
                <View
                  style={[
                    styles.circle,
                    isDone && styles.circleDone,
                    isActive && styles.circleActive,
                  ]}
                >
                  {(isDone || isActive) && (
                    <View style={styles.innerDot} />
                  )}
                </View>

                {index !== steps.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      index < currentIndex && styles.lineDone,
                    ]}
                  />
                )}
              </View>

              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isDone && styles.stepLabelDone,
                  ]}
                >
                  {step.label}
                </Text>

                <Text style={styles.stepSub}>
                  {role === "seller"
                    ? step.subSeller
                    : step.subBuyer}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
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

  stepsWrap: {
    gap: 2,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  leftRail: {
    width: 26,
    alignItems: "center",
  },

  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F1F1F1",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  circleDone: {
    backgroundColor: "#D97732",
    borderColor: "#D97732",
  },

  circleActive: {
    backgroundColor: "#D97732",
    borderColor: "#D97732",
  },

  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },

  line: {
    width: 2,
    flex: 1,
    minHeight: 30,
    backgroundColor: "#E5E5E5",
    marginTop: 4,
  },

  lineDone: {
    backgroundColor: "#D97732",
  },

  stepContent: {
    flex: 1,
    paddingBottom: 14,
    paddingLeft: 4,
  },

  stepLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },

  stepLabelActive: {
    color: "#111",
  },

  stepLabelDone: {
    color: "#111",
  },

  stepSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
    lineHeight: 17,
  },
})