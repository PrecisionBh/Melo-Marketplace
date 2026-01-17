import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function BuyerProtectionScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#E8F5EE" />
          <Text style={styles.backText}>Legal</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Buyer Protection</Text>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="How Buyer Protection Works">
          <Text style={styles.text}>
            Melo provides Buyer Protection to help ensure fair and secure
            transactions. Payments are held securely until your order is
            completed, giving you time to inspect your purchase.
          </Text>
        </Section>

        <Section title="Escrow & Payment Holding">
          <Text style={styles.text}>
            When you place an order, your payment is held in escrow. Funds are
            not released to the seller until:
          </Text>

          <Text style={styles.list}>
            • You confirm the order is complete{"\n"}
            • The inspection window expires without dispute
          </Text>
        </Section>

        <Section title="Delivery & Inspection Period">
          <Text style={styles.text}>
            Once an order is marked as delivered, you have a limited inspection
            period to review your item. During this time, you may:
          </Text>

          <Text style={styles.list}>
            • Confirm the order is complete{"\n"}
            • Report an issue if the item is not as described
          </Text>
        </Section>

        <Section title="Reporting an Issue">
          <Text style={styles.text}>
            If your order arrives damaged, incorrect, or significantly different
            from the listing, you may report an issue directly from your order
            page. Issues must be reported within the allowed timeframe.
          </Text>
        </Section>

        <Section title="Dispute Process">
          <Text style={styles.text}>
            If an issue is not resolved between you and the seller, you may
            escalate it to a formal dispute. Only one dispute may be opened per
            order.
          </Text>

          <Text style={styles.text}>
            Melo may review messages, photos, tracking data, and other evidence
            to determine the outcome.
          </Text>
        </Section>

        <Section title="Possible Outcomes">
          <Text style={styles.text}>
            Dispute outcomes may include:
          </Text>

          <Text style={styles.list}>
            • Full refund{"\n"}
            • Partial refund{"\n"}
            • Release of funds to the seller
          </Text>
        </Section>

        <Section title="When Protection Ends">
          <Text style={styles.text}>
            Buyer Protection ends when:
          </Text>

          <Text style={styles.list}>
            • You confirm the order is complete{"\n"}
            • The inspection period expires without action{"\n"}
            • A dispute is resolved and closed
          </Text>

          <Text style={styles.text}>
            Once protection ends, the sale is considered final.
          </Text>
        </Section>

        <Section title="What Is Not Covered">
          <Text style={styles.text}>
            Buyer Protection does not cover:
          </Text>

          <Text style={styles.list}>
            • Buyer remorse or change of mind{"\n"}
            • Damage after delivery{"\n"}
            • Issues disclosed in the original listing{"\n"}
            • Items prohibited by Melo policy
          </Text>
        </Section>

        <Section title="Your Responsibility as a Buyer">
          <Text style={styles.text}>
            Buyers are responsible for reviewing listings carefully, asking
            questions before purchase, and reporting issues promptly.
          </Text>
        </Section>

        <Section title="Our Commitment">
          <Text style={styles.text}>
            Melo is committed to providing a fair marketplace experience.
            While we cannot guarantee every transaction outcome, we aim to
            protect buyers and sellers through clear rules and transparent
            dispute resolution.
          </Text>
        </Section>

        <Text style={styles.footer}>
          Buyer Protection applies only to purchases made through the Melo app.
        </Text>
      </ScrollView>
    </View>
  )
}

/* ---------------- COMPONENT ---------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  backBtn: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 6,
    color: "#E8F5EE",
    fontWeight: "600",
    fontSize: 13,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
    marginBottom: 6,
  },

  text: {
    fontSize: 13,
    lineHeight: 19,
    color: "#0F1E17",
  },

  list: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#0F1E17",
  },

  footer: {
    marginTop: 20,
    fontSize: 12,
    color: "#6B8F7D",
    textAlign: "center",
  },
})
