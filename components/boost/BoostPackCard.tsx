import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

type Pack = {
  id: string
  title: string
  subtitle: string
  badge?: string
  accent?: "boost"
}

export default function BoostPackCard({
  pack,
  price,
  loading,
  onPress,
}: {
  pack: Pack
  price: string
  loading: boolean
  onPress: () => void
}) {
  return (
    <LinearGradient
      colors={[
        "#FFB347",
        "#FF8C42",
        "#FF6B00",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.card}>
        {pack.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {pack.badge}
            </Text>
          </View>
        )}

        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="flash"
              size={22}
              color="#FF7A00"
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.title}>
              {pack.title}
            </Text>

            <Text style={styles.subtitle}>
              {pack.subtitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.buyBtn}
          onPress={onPress}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="flash"
                size={16}
                color="#fff"
                style={{
                  marginRight: 6,
                }}
              />

              <Text style={styles.buyText}>
                Buy Boost Credits • {price}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 28,
    marginBottom: 18,

    shadowColor: "#FF7A00",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 14,

    elevation: 10,
  },

  card: {
    borderRadius: 28,

    padding: 20,

    backgroundColor: "rgba(255,255,255,0.12)",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  badge: {
    position: "absolute",
    top: 14,
    right: 14,

    backgroundColor: "#111827",

    paddingHorizontal: 12,
    paddingVertical: 6,

    borderRadius: 999,
  },

  badgeText: {
    color: "#fff",

    fontSize: 11,
    fontWeight: "900",

    letterSpacing: 0.4,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 14,

    marginBottom: 18,
  },

  iconWrap: {
    width: 56,
    height: 56,

    borderRadius: 18,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",
  },

  info: {
    flex: 1,
    paddingRight: 55,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",

    color: "#111827",

    marginBottom: 4,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,

    color: "#1F2937",

    fontWeight: "600",
  },

  buyBtn: {
    backgroundColor: "#111827",

    borderRadius: 18,

    paddingVertical: 16,

    alignItems: "center",
    justifyContent: "center",

    flexDirection: "row",
  },

  buyText: {
    color: "#fff",

    fontWeight: "900",

    fontSize: 14,

    letterSpacing: 0.3,
  },
})