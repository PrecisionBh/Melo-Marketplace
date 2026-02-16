import { useRouter } from "expo-router"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"

export default function SellerPayoutPolicyScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
        title="Seller Payout Policy"
        backLabel="Legal"
        backRoute="/legal"
      />

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="How Seller Payouts Work">
          <Text style={styles.text}>
            Melo uses a secure escrow system to protect both buyers and sellers.
            Funds are not released immediately after a sale and are subject to
            order completion requirements.
          </Text>
        </Section>

        <Section title="When Funds Are Held">
          <Text style={styles.text}>
            After a buyer places an order, payment is held in escrow until:
          </Text>

          <Text style={styles.list}>
            • The order is marked as delivered{"\n"}
            • The buyer completes the inspection period{"\n"}
            • Any reported issues are resolved
          </Text>
        </Section>

        <Section title="Shipping Requirements">
          <Text style={styles.text}>
            Sellers must ship items promptly and provide valid tracking
            information through the Melo platform.
          </Text>

          <Text style={styles.text}>
            Failure to provide tracking or delayed shipment may result in payout
            delays or order cancellation.
          </Text>
        </Section>

        <Section title="Delivery & Inspection Period">
          <Text style={styles.text}>
            Once delivery is confirmed, the buyer is given a limited inspection
            period to review the item.
          </Text>

          <Text style={styles.text}>
            During this time, the buyer may confirm completion or report an
            issue. Funds remain on hold until this period ends.
          </Text>
        </Section>

        <Section title="Disputes & Payout Delays">
          <Text style={styles.text}>
            If a buyer reports an issue or files a dispute, payout is paused
            until the matter is resolved.
          </Text>

          <Text style={styles.text}>
            Melo may request evidence from the seller, including photos,
            messages, or proof of shipment.
          </Text>
        </Section>

        <Section title="Payout Release">
          <Text style={styles.text}>
            Funds are released to the seller when:
          </Text>

          <Text style={styles.list}>
            • The buyer confirms order completion{"\n"}
            • The inspection window expires without dispute{"\n"}
            • A dispute is resolved in the seller’s favor
          </Text>
        </Section>

        <Section title="Payout Method">
          <Text style={styles.text}>
            Sellers are responsible for maintaining accurate payout and tax
            information. Melo is not responsible for failed payouts due to
            incorrect or outdated information.
          </Text>
        </Section>

        <Section title="Fees & Deductions">
          <Text style={styles.text}>
            Marketplace fees, refunds, chargebacks, or dispute resolutions may
            be deducted from seller payouts when applicable.
          </Text>
        </Section>

        <Section title="Seller Responsibilities">
          <Text style={styles.text}>
            Sellers are expected to:
          </Text>

          <Text style={styles.list}>
            • Accurately describe items{"\n"}
            • Ship orders on time{"\n"}
            • Communicate professionally with buyers{"\n"}
            • Resolve issues in good faith
          </Text>
        </Section>

        <Section title="Finality of Payouts">
          <Text style={styles.text}>
            Once funds are released and the order is marked as completed,
            payouts are considered final and non-reversible, except where
            required by law.
          </Text>
        </Section>

        <Section title="Policy Enforcement">
          <Text style={styles.text}>
            Melo reserves the right to delay, suspend, or withhold payouts for
            violations of platform policies, fraud, or misuse of the service.
          </Text>
        </Section>

        <Text style={styles.footer}>
          This policy applies to all sellers using the Melo marketplace.
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
