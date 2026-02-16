import { useRouter } from "expo-router"
import React from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"

export default function FAQsScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
        title="Frequently Asked Questions"
        backLabel="Legal"
        backRoute="/legal"
      />

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="What is Melo?">
          <Text style={styles.text}>
            Melo is a peer-to-peer marketplace that allows users to buy and sell
            items securely using escrow-based payments, shipment tracking, and
            dispute resolution tools.
          </Text>
        </Section>

        <Section title="How does buying work?">
          <Text style={styles.text}>
            When you purchase an item on Melo:
          </Text>

          <Text style={styles.list}>
            • Your payment is held securely in escrow{"\n"}
            • The seller ships the item with tracking{"\n"}
            • You receive and inspect the item{"\n"}
            • Funds are released once the order is completed
          </Text>
        </Section>

        <Section title="When do I get charged?">
          <Text style={styles.text}>
            Buyers are charged at the time of purchase. Funds are held securely
            and are not released to the seller until the order is completed.
          </Text>
        </Section>

        <Section title="How long does shipping take?">
          <Text style={styles.text}>
            Shipping times vary by seller and carrier. Sellers are expected to
            ship promptly and provide tracking information.
          </Text>
        </Section>

        <Section title="What happens after delivery?">
          <Text style={styles.text}>
            After delivery, buyers are given a limited inspection window to
            review the item. During this time, buyers may confirm completion or
            report an issue.
          </Text>
        </Section>

        <Section title="What if there is a problem with my order?">
          <Text style={styles.text}>
            If there is an issue, buyers should first message the seller through
            the app. If the issue is not resolved, buyers may report an issue
            and escalate to a dispute when eligible.
          </Text>
        </Section>

        <Section title="How do disputes work?">
          <Text style={styles.text}>
            Disputes allow Melo to review order details, messages, and evidence
            from both parties. A resolution may include a refund, partial
            refund, or completion in favor of the seller.
          </Text>
        </Section>

        <Section title="Can I cancel an order?">
          <Text style={styles.text}>
            Orders cannot be canceled once shipped. Cancellation eligibility
            depends on the order status and seller approval.
          </Text>
        </Section>

        <Section title="Are returns allowed?">
          <Text style={styles.text}>
            Returns are not automatically guaranteed. Returns or refunds are
            handled through the dispute resolution process when applicable.
          </Text>
        </Section>

        <Section title="When do sellers get paid?">
          <Text style={styles.text}>
            Sellers receive payment after:
          </Text>

          <Text style={styles.list}>
            • The buyer confirms completion{"\n"}
            • The inspection window expires{"\n"}
            • Any dispute is resolved
          </Text>
        </Section>

        <Section title="Does Melo inspect items?">
          <Text style={styles.text}>
            Melo does not physically inspect items. Listings and transactions
            are between buyers and sellers, with platform-based protections.
          </Text>
        </Section>

        <Section title="What fees does Melo charge?">
          <Text style={styles.text}>
            Marketplace fees may apply to sellers. Fees are disclosed during
            listing creation or payout setup.
          </Text>
        </Section>

        <Section title="Is Melo responsible for lost or damaged items?">
          <Text style={styles.text}>
            Melo is not responsible for carrier delays, lost shipments, or
            damage. Disputes related to shipping issues may be reviewed based on
            available evidence.
          </Text>
        </Section>

        <Section title="Is my payment information safe?">
          <Text style={styles.text}>
            Yes. Payment information is handled securely by trusted payment
            providers. Melo does not store full payment credentials.
          </Text>
        </Section>

        <Section title="Can my account be suspended?">
          <Text style={styles.text}>
            Yes. Accounts may be suspended or terminated for violations of
            platform policies, fraudulent activity, or misuse of the service.
          </Text>
        </Section>

        <Section title="How do I contact support?">
          <Text style={styles.text}>
            Support can be reached through in-app messaging or the support
            forms available in the app.
          </Text>
        </Section>

        <Text style={styles.footer}>
          These FAQs are provided for informational purposes and do not replace
          the Terms & Conditions.
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
    marginTop: 24,
    fontSize: 12,
    color: "#6B8F7D",
    textAlign: "center",
  },
})
