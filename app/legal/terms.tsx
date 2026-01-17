import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function TermsScreen() {
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

        <Text style={styles.headerTitle}>Terms & Conditions</Text>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="1. Acceptance of Terms">
          <Text style={styles.text}>
            By accessing or using the Melo marketplace (“Melo”, “we”, “our”,
            or “us”), you agree to be bound by these Terms and Conditions.
            If you do not agree, you may not use the platform.
          </Text>
        </Section>

        <Section title="2. Marketplace Role">
          <Text style={styles.text}>
            Melo is a peer-to-peer marketplace that facilitates transactions
            between buyers and sellers. Melo is not the seller of items listed
            on the platform and does not take ownership of listed goods.
          </Text>
        </Section>

        <Section title="3. User Accounts">
          <Text style={styles.text}>
            You are responsible for maintaining the security of your account
            and for all activity that occurs under your account. You must
            provide accurate and complete information.
          </Text>
        </Section>

        <Section title="4. Listings & Prohibited Items">
          <Text style={styles.text}>
            Sellers are solely responsible for the accuracy, legality, and
            fulfillment of their listings. The following items are prohibited:
          </Text>

          <Text style={styles.list}>
            • Illegal or stolen goods{"\n"}
            • Counterfeit or infringing items{"\n"}
            • Weapons, drugs, or regulated substances{"\n"}
            • Items that violate local, state, or federal laws
          </Text>

          <Text style={styles.text}>
            Melo reserves the right to remove listings or suspend accounts
            that violate these rules.
          </Text>
        </Section>

        <Section title="5. Payments & Escrow">
          <Text style={styles.text}>
            Payments made through Melo are held in escrow until the order is
            completed. Funds are released to the seller once the buyer confirms
            delivery or the escrow period expires without dispute.
          </Text>
        </Section>

        <Section title="6. Shipping & Delivery">
          <Text style={styles.text}>
            Sellers are responsible for shipping items accurately and promptly.
            Tracking information must be provided when required. Melo is not
            responsible for carrier delays or lost packages.
          </Text>
        </Section>

        <Section title="7. Buyer Responsibilities">
          <Text style={styles.text}>
            Buyers are responsible for reviewing listings carefully before
            purchase. Once delivery is confirmed or the dispute window expires,
            the sale is considered final.
          </Text>
        </Section>

        <Section title="8. Issues & Disputes">
          <Text style={styles.text}>
            Buyers may report an issue after delivery if an order does not
            match the listing or arrives damaged. Disputes must be filed within
            the allowed timeframe. Only one dispute may be opened per order.
          </Text>
        </Section>

        <Section title="9. Dispute Resolution">
          <Text style={styles.text}>
            Melo may review disputes and determine outcomes including refunds,
            partial refunds, or release of funds. Decisions are made based on
            available evidence and are final.
          </Text>
        </Section>

        <Section title="10. Fees">
          <Text style={styles.text}>
            Melo may charge service fees or payment processing fees. All fees
            are disclosed at checkout or within seller tools.
          </Text>
        </Section>

        <Section title="11. Refunds">
          <Text style={styles.text}>
            Refunds are issued only through approved dispute outcomes or as
            otherwise required by law. Melo does not guarantee refunds outside
            these conditions.
          </Text>
        </Section>

        <Section title="12. Account Suspension">
          <Text style={styles.text}>
            Melo reserves the right to suspend or terminate accounts for
            violations of these Terms, fraudulent activity, or abuse of the
            platform.
          </Text>
        </Section>

        <Section title="13. Limitation of Liability">
          <Text style={styles.text}>
            To the fullest extent permitted by law, Melo shall not be liable
            for indirect, incidental, or consequential damages arising from
            use of the platform.
          </Text>
        </Section>

        <Section title="14. Indemnification">
          <Text style={styles.text}>
            You agree to indemnify and hold harmless Melo from any claims,
            damages, or losses arising from your use of the platform or
            violation of these Terms.
          </Text>
        </Section>

        <Section title="15. Arbitration & Governing Law">
          <Text style={styles.text}>
            Any disputes arising from these Terms shall be resolved through
            binding arbitration. These Terms are governed by applicable law.
          </Text>
        </Section>

        <Section title="16. Changes to Terms">
          <Text style={styles.text}>
            Melo may update these Terms at any time. Continued use of the
            platform constitutes acceptance of the updated Terms.
          </Text>
        </Section>

        <Section title="17. Contact">
          <Text style={styles.text}>
            For questions regarding these Terms, contact support through the
            Melo app.
          </Text>
        </Section>

        <Text style={styles.footer}>
          Last updated: {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

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
