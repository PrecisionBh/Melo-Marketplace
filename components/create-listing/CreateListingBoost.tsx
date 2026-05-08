import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

type BoostType =
  | "none"
  | "boost"

type Props = {
  selectedBoost: BoostType
  setSelectedBoost: (
    val: BoostType
  ) => void
  boostCredits: number
  onBuyCredits: () => void
  onPublish: () => void
  submitting?: boolean
}

export default function CreateListingBoost({
  selectedBoost,
  setSelectedBoost,
  boostCredits,
  onBuyCredits,
  onPublish,
  submitting,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>
            Boost Your Listing
          </Text>

          <Text style={styles.subHeader}>
            Get more eyes on your item
            faster
          </Text>
        </View>

        <TouchableOpacity
          onPress={onBuyCredits}
          activeOpacity={0.9}
          style={styles.creditWrap}
        >
          <Text style={styles.creditLabel}>
            Available Credits
          </Text>

          <Text style={styles.creditText}>
            ⚡ {boostCredits}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.optionRow}>
        <BoostCard
          active={
            selectedBoost === "none"
          }
          title="Standard Listing"
          sub="Normal marketplace placement"
          onPress={() =>
            setSelectedBoost("none")
          }
        />

        <BoostCard
          active={
            selectedBoost === "boost"
          }
          title="Boost Listing"
          sub="Push your item higher in the feed for 7 days"
          onPress={() =>
            setSelectedBoost("boost")
          }
          disabled={
            boostCredits <= 0
          }
          disabledText="No boost credits"
          boosted
        />
      </View>

      <TouchableOpacity
        onPress={onPublish}
        disabled={submitting}
        style={[
          styles.publishBtn,
          submitting && {
            opacity: 0.6,
          },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.publishText}>
            Publish Listing
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

function BoostCard({
  active,
  title,
  sub,
  onPress,
  disabled,
  disabledText,
  boosted,
}: {
  active: boolean
  title: string
  sub: string
  onPress: () => void
  disabled?: boolean
  disabledText?: string
  boosted?: boolean
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        active &&
          styles.cardActive,
        disabled &&
          styles.cardDisabled,
        boosted &&
          styles.boostedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <View>
        <Text
          style={[
            styles.cardTitle,
            boosted &&
              styles.boostedTitle,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.cardSub,
            boosted &&
              styles.boostedSub,
          ]}
        >
          {sub}
        </Text>
      </View>

      {active && (
        <View style={styles.activeBadge}>
          <Text
            style={styles.activeBadgeText}
          >
            SELECTED
          </Text>
        </View>
      )}

      {boosted && (
        <View style={styles.refundBox}>
          <Text
            style={styles.refundText}
          >
            ♻️ Boost refunded if item
            doesn't sell
          </Text>
        </View>
      )}

      {disabled && (
        <Text
          style={styles.disabledText}
        >
          {disabledText}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: 18,
  },

  header: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  subHeader: {
    marginTop: 3,

    fontSize: 13,
    color: "#6B7280",
  },

  creditWrap: {
    backgroundColor: "#111827",

    borderRadius: 18,

    paddingHorizontal: 14,
    paddingVertical: 10,

    alignItems: "center",
  },

  creditLabel: {
    fontSize: 10,
    fontWeight: "800",

    color: "#9CA3AF",

    marginBottom: 3,

    letterSpacing: 0.5,
  },

  creditText: {
    fontSize: 18,
    fontWeight: "900",

    color: "#FFFFFF",
  },

  optionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  card: {
    flex: 1,

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    padding: 18,

    minHeight: 190,

    justifyContent: "space-between",
  },

  boostedCard: {
    backgroundColor: "#FFF8F3",

    borderColor: "#FFD7B8",

    shadowColor: "#FFB067",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.14,
    shadowRadius: 10,

    elevation: 5,
  },

  cardActive: {
    borderWidth: 2,
    borderColor: "#111827",
  },

  cardDisabled: {
    opacity: 0.6,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",

    color: "#111827",

    marginBottom: 8,
  },

  boostedTitle: {
    color: "#C2410C",
  },

  cardSub: {
    fontSize: 13,
    lineHeight: 20,

    color: "#6B7280",
  },

  boostedSub: {
    color: "#9A3412",
  },

  activeBadge: {
    alignSelf: "flex-start",

    backgroundColor: "#111827",

    borderRadius: 999,

    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  activeBadgeText: {
    color: "#fff",

    fontSize: 10,
    fontWeight: "900",

    letterSpacing: 0.5,
  },

  refundBox: {
    backgroundColor: "rgba(255,255,255,0.75)",

    borderRadius: 14,

    padding: 10,

    marginTop: 14,

    borderWidth: 1,
    borderColor: "#FED7AA",
  },

  refundText: {
    fontSize: 11,
    lineHeight: 16,

    color: "#9A3412",

    fontWeight: "700",
  },

  disabledText: {
    marginTop: 12,

    fontSize: 12,
    color: "#EF4444",

    fontWeight: "700",
  },

  publishBtn: {
    backgroundColor: "#D97732",

    borderRadius: 22,

    paddingVertical: 18,

    alignItems: "center",

    shadowColor: "#D97732",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,

    elevation: 5,
  },

  publishText: {
    color: "#fff",

    fontSize: 16,
    fontWeight: "900",

    letterSpacing: 0.3,
  },
})