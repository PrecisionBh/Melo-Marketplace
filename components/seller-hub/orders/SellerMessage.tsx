import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

type Variant = "info" | "warning" | "success" | "neutral" | "error"

type Props = {
  title: string
  message: string
  variant?: Variant
}

export default function SellerMessage({
  title,
  message,
  variant = "info",
}: Props) {
  const variantStyles = getVariantStyles(variant)

  return (
    <View style={[styles.card, variantStyles.card]}>
      <View style={styles.headerRow}>
        <Ionicons
          name={variantStyles.icon}
          size={18}
          color={variantStyles.iconColor}
        />
        <Text style={[styles.title, variantStyles.title]}>
          {title}
        </Text>
      </View>

      <Text style={[styles.message, variantStyles.message]}>
        {message}
      </Text>
    </View>
  )
}

function getVariantStyles(variant: Variant) {
  switch (variant) {
    /* 🟠 WARNING — Returns, escrow frozen, action required */
    case "warning":
      return {
        card: styles.warningCard,
        title: styles.warningTitle,
        message: styles.warningMessage,
        icon: "alert-circle-outline" as const,
        iconColor: "#B54747",
      }

    /* 🟢 SUCCESS — Completed, refund paid, resolved */
    case "success":
      return {
        card: styles.successCard,
        title: styles.successTitle,
        message: styles.successMessage,
        icon: "checkmark-circle-outline" as const,
        iconColor: "#1F7A63",
      }

    /* 🔴 ERROR — Disputes / critical issues */
    case "error":
      return {
        card: styles.errorCard,
        title: styles.errorTitle,
        message: styles.errorMessage,
        icon: "close-circle-outline" as const,
        iconColor: "#E5484D",
      }

    /* ⚪ NEUTRAL — Waiting states (awaiting buyer, awaiting shipment) */
    case "neutral":
      return {
        card: styles.neutralCard,
        title: styles.neutralTitle,
        message: styles.neutralMessage,
        icon: "time-outline" as const,
        iconColor: "#2E5F4F",
      }

    /* 🔵 INFO — Default Melo guidance */
    case "info":
    default:
      return {
        card: styles.infoCard,
        title: styles.infoTitle,
        message: styles.infoMessage,
        icon: "information-circle-outline" as const,
        iconColor: "#7FAF9B", // Melo header color
      }
  }
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  title: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  message: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },

  /* 🔵 INFO (Default Melo guidance) */
  infoCard: {
    backgroundColor: "#F4FAF7",
    borderColor: "#CFE6DD",
  },
  infoTitle: {
    color: "#0F1E17",
  },
  infoMessage: {
    color: "#2E5F4F",
  },

  /* 🟠 WARNING (Returns / Escrow Frozen / Risk) */
  warningCard: {
    backgroundColor: "#FFF4F4",
    borderColor: "#F1C6C6",
  },
  warningTitle: {
    color: "#B54747",
  },
  warningMessage: {
    color: "#7A1F1F",
  },

  /* 🟢 SUCCESS (Refund Paid / Completed / Resolved) */
  successCard: {
    backgroundColor: "#E8F7EF",
    borderColor: "#B7E4C7",
  },
  successTitle: {
    color: "#1F7A63",
  },
  successMessage: {
    color: "#2E5F4F",
  },

  /* 🔴 ERROR (Disputes / Critical Issues) */
  errorCard: {
    backgroundColor: "#FFF1F1",
    borderColor: "#E5484D",
  },
  errorTitle: {
    color: "#E5484D",
  },
  errorMessage: {
    color: "#7A1F1F",
  },

  /* ⚪ NEUTRAL (Waiting / Passive States) */
  neutralCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2EFE8",
  },
  neutralTitle: {
    color: "#0F1E17",
  },
  neutralMessage: {
    color: "#6B8F7D",
  },
})