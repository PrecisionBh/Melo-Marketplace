import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type BoostType = "none" | "boost" | "mega"

type Props = {
  selectedBoost: BoostType
  setSelectedBoost: (val: BoostType) => void
  boostCredits: number
  megaCredits: number
  onBuyCredits: () => void
  onPublish: () => void
}

export default function CreateListingBoost({
  selectedBoost,
  setSelectedBoost,
  boostCredits,
  megaCredits,
  onBuyCredits,
  onPublish,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          Boost Listing
        </Text>

        <View style={styles.creditRow}>
          <Text style={styles.creditText}>
            ⚡ {boostCredits} Boost
          </Text>

          <Text style={styles.creditText}>
            🚀 {megaCredits} Mega
          </Text>

          <TouchableOpacity
            onPress={onBuyCredits}
          >
            <Text style={styles.buyText}>
              Buy
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.optionRow}>
        <BoostCard
          active={
            selectedBoost === "none"
          }
          title="No Boost"
          sub="Standard listing placement"
          onPress={() =>
            setSelectedBoost("none")
          }
        />

        <BoostCard
          active={
            selectedBoost === "boost"
          }
          title="Boost"
          sub="3x more views for 7 days"
          onPress={() =>
            setSelectedBoost("boost")
          }
          disabled={
            boostCredits <= 0
          }
          disabledText="No credits"
        />

        <BoostCard
          active={
            selectedBoost === "mega"
          }
          title="Mega Boost"
          sub="10x views + Enlarged listing for 14 days"
          onPress={() =>
            setSelectedBoost("mega")
          }
          disabled={
            megaCredits <= 0
          }
          disabledText="No credits"
        />
      </View>

      <TouchableOpacity
        style={styles.publishBtn}
        onPress={onPublish}
      >
        <Text style={styles.publishText}>
          Publish Listing
        </Text>
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
}: {
  active: boolean
  title: string
  sub: string
  onPress: () => void
  disabled?: boolean
  disabledText?: string
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        active &&
          styles.cardActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text style={styles.cardTitle}>
        {title}
      </Text>

      <Text style={styles.cardSub}>
        {sub}
      </Text>

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
    marginBottom: 14,
  },

  header: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  creditText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },

  buyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D97732",
  },

  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 14,
    minHeight: 150,
  },

  cardActive: {
    borderColor: "#D97732",
    backgroundColor: "#FFF7F1",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  cardSub: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },

  disabledText: {
    marginTop: 12,
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "700",
  },

  publishBtn: {
    backgroundColor: "#D97732",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },

  publishText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
})