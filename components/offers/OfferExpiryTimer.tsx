import { useEffect, useState } from "react"
import {
    StyleSheet,
    Text,
    View,
} from "react-native"

export default function OfferExpiryTimer({
  expiresAt,
}: {
  expiresAt: string
}) {
  const [timeLeft, setTimeLeft] =
    useState("")

  useEffect(() => {
    const updateTimer = () => {
      const diff =
        new Date(expiresAt).getTime() -
        Date.now()

      if (diff <= 0) {
        setTimeLeft("Expired")
        return
      }

      const hours = Math.floor(
        diff / (1000 * 60 * 60)
      )

      const minutes = Math.floor(
        (diff %
          (1000 * 60 * 60)) /
          (1000 * 60)
      )

      const seconds = Math.floor(
        (diff % (1000 * 60)) / 1000
      )

      setTimeLeft(
        `${hours}h ${minutes}m ${seconds}s`
      )
    }

    updateTimer()

    const interval = setInterval(
      updateTimer,
      1000
    )

    return () =>
      clearInterval(interval)
  }, [expiresAt])

  if (timeLeft === "Expired") return null

  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        Offer Expires In
      </Text>

      <Text style={styles.timer}>
        {timeLeft}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C2410C",
    marginBottom: 4,
    textTransform: "uppercase",
  },

  timer: {
    fontSize: 18,
    fontWeight: "800",
    color: "#EA580C",
  },
})