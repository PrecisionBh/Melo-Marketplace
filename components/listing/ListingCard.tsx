import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Listing = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  status: "active" | "inactive"
  is_boosted?: boolean
}

type Props = {
  item: Listing
  isPro: boolean
  boostRemaining: number
  onPress: () => void
  onEdit: () => void
  onDelete: () => void
  onDeactivate: () => void
  onDuplicate: () => void
  onBoost: () => void
}

export default function ListingCard({
  item,
  isPro,
  boostRemaining,
  onPress,
  onEdit,
  onDelete,
  onDeactivate,
  onDuplicate,
  onBoost,
}: Props) {
  const isActive = item.status === "active"
  const isBoosted = item.is_boosted === true

  return (
    <View style={styles.shadowBox}>
      <View style={styles.card}>
        {/* MAIN ROW */}
        <TouchableOpacity style={styles.row} onPress={onPress}>
          <Image
            source={{
              uri:
                item.image_urls?.[0] ??
                "https://via.placeholder.com/150",
            }}
            style={styles.image}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.price}>
              ${item.price.toFixed(2)}
            </Text>

            {/* STATUS + BOOST BADGES */}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.statusPill,
                  isActive
                    ? styles.activePill
                    : styles.inactivePill,
                ]}
              >
                <Text style={styles.statusText}>
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>

              {isBoosted && (
                <View style={styles.boostedBadge}>
                  <Text style={styles.boostedText}>
                    ⭐ BOOSTED
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* BOOST BUTTON (PRO ONLY + NOT ALREADY BOOSTED) */}
        {isPro && isActive && !isBoosted && (
          <TouchableOpacity
            style={[
              styles.boostBtn,
              boostRemaining <= 0 && styles.boostDisabled,
            ]}
            disabled={boostRemaining <= 0}
            onPress={onBoost}
          >
            <Text style={styles.boostBtnText}>
              🚀 Boost Listing
            </Text>
          </TouchableOpacity>
        )}

        {/* TOGGLE ACTIVE / DEACTIVE */}
        <View style={styles.actionsRow}>
          {isActive ? (
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={onDeactivate}
            >
              <Text style={styles.smallBtnText}>
                Deactivate
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={onDuplicate}
            >
              <Text style={styles.smallBtnText}>
                Reactivate
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.smallBtn, styles.deleteBtn]}
            onPress={onDelete}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* EDIT BUTTON */}
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Text style={styles.editText}>EDIT</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* TRUE SHADOW BOX CONTAINER */
  shadowBox: {
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",

    // iOS Shadow (soft premium)
    shadowColor: "#0F1E17",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },

    // Android Shadow
    elevation: 6,
  },

  /* INNER CARD (keeps padding clean inside shadow) */
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0F4F2",
  },

  row: {
    flexDirection: "row",
    gap: 14,
  },

  image: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: "#D6E6DE",
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  price: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "900",
    color: "#0F1E17",
  },

  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  activePill: {
    backgroundColor: "#E8F8F0",
  },

  inactivePill: {
    backgroundColor: "#ECECEC",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F1E17",
  },

  boostedBadge: {
    backgroundColor: "#0F1E17",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  boostedText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#7FAF9B", // Melo brand color
  },

  boostBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
  },

  boostDisabled: {
    opacity: 0.4,
  },

  boostBtnText: {
    fontWeight: "900",
    fontSize: 14,
    color: "#7FAF9B",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  smallBtn: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
  },

  smallBtnText: {
    fontWeight: "800",
    color: "#0F1E17",
  },

  deleteBtn: {
    backgroundColor: "#FCEAEA",
  },

  deleteText: {
    fontWeight: "800",
    color: "#C0392B",
  },

  editBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  editText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 1,
  },
})