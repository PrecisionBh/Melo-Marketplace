import { Ionicons } from "@expo/vector-icons"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  onLearnMore?: () => void
}

export default function BuyerProtectionNotice({
  onLearnMore,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons
        name="shield-checkmark"
        size={18}
        color="#16A34A"
        style={styles.icon}
      />

      <View style={styles.content}>
        <Text style={styles.title}>
          Melo Buyer Protection
        </Text>

        <Text style={styles.body}>
          You're covered if your item
          doesn't arrive, is not as
          described, or arrives damaged.
          Your Buyer Protection Fee helps
          fund this guarantee.
        </Text>

        {onLearnMore && (
          <TouchableOpacity
            onPress={onLearnMore}
            activeOpacity={0.8}
          >
            <Text style={styles.link}>
              Learn More
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },

  icon: {
    marginTop: 2,
    marginRight: 12,
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 4,
  },

  body: {
    fontSize: 12,
    lineHeight: 18,
    color: "#166534",
  },

  link: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "#15803D",
    textDecorationLine: "underline",
  },
})