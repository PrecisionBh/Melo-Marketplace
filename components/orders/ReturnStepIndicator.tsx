import {
    StyleSheet,
    Text,
    View,
} from "react-native"

type Props = {
  order: any
  role?: "buyer" | "seller"
}

const RETURN_STEPS = [
  {
    key: "return_started",
    label: "Return Started",
    subBuyer: "Return initiated",
    subSeller: "Buyer started return",
  },
  {
    key: "return_shipped",
    label: "Shipped Back",
    subBuyer: "Return is on the way",
    subSeller: "Buyer shipped return",
  },
  {
    key: "return_processing",
    label: "Seller Received",
    subBuyer: "Seller reviewing return",
    subSeller: "Inspecting returned item",
  },
  {
    key: "refunded",
    label: "Refund Completed",
    subBuyer: "Refund issued",
    subSeller: "Return resolved",
  },
]

function getCurrentStepIndex(order: any) {
  switch (order.status) {
    case "return_started":
    case "return_label_purchased":
      return 0

    case "return_shipped":
      return 1

    case "return_processing":
      return 2

    case "refunded":
    case "completed":
      return 3

    default:
      return 0
  }
}

export default function ReturnStepIndicator({
  order,
  role = "buyer",
}: Props) {
  const currentIndex = getCurrentStepIndex(order)

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Return Progress</Text>

      <View style={styles.stepsWrap}>
        {RETURN_STEPS.map((step, index) => {
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

                {index !== RETURN_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      index < currentIndex &&
                        styles.lineDone,
                    ]}
                  />
                )}
              </View>

              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive &&
                      styles.stepLabelActive,
                    isDone &&
                      styles.stepLabelDone,
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