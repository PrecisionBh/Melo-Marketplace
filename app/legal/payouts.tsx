import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import React from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

export default function PayoutsScreen() {
  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>
          Seller Payouts
        </Text>

        <Section title="How Seller Payouts Work">
          <Text style={styles.text}>
            Melo securely processes seller payouts through our payment
            partner Stripe. When an order is successfully completed and
            escrow is released, the seller becomes eligible to withdraw
            their earnings.
          </Text>
        </Section>

        <Section title="Escrow Release">
          <Text style={styles.text}>
            Seller funds are held in escrow while the transaction is in
            progress. This protects both buyers and sellers during the
            order process.
          </Text>

          <Text style={styles.text}>
            Funds are released from escrow once:
          </Text>

          <Text style={styles.list}>
            • The buyer confirms the order is complete{"\n"}
            • The inspection window expires without issue{"\n"}
            • Any dispute or return is resolved
          </Text>
        </Section>

        <Section title="Standard Payouts">
          <Text style={styles.text}>
            Standard payouts are completely free. Sellers may withdraw
            their available balance to their connected payout account
            without any additional platform fee.
          </Text>

          <Text style={styles.text}>
            Standard transfers typically take several business days
            depending on bank processing times.
          </Text>
        </Section>

        <Section title="Instant Payouts">
          <Text style={styles.text}>
            Melo also supports Instant Payouts for sellers who want to
            access their funds immediately.
          </Text>

          <Text style={styles.text}>
            Instant payouts may include a small processing fee charged
            by Stripe to transfer funds instantly to an eligible debit
            card or bank account.
          </Text>

          <Text style={styles.text}>
            This fee is determined by the payment processor and may vary
            depending on the payout destination.
          </Text>
        </Section>

        <Section title="Secure Payment Processing">
          <Text style={styles.text}>
            Melo prioritizes secure and reliable payments. All payment
            processing, escrow management, and payouts are handled
            through Stripe, a trusted global payment provider.
          </Text>

          <Text style={styles.text}>
            Stripe manages payment security, fraud protection, and
            financial compliance to ensure transactions are processed
            safely.
          </Text>
        </Section>

        <Section title="Payout Requirements">
          <Text style={styles.text}>
            Sellers must connect a valid payout account before
            withdrawing funds. Identity verification or additional
            information may be required by Stripe in order to comply
            with financial regulations.
          </Text>
        </Section>

        <Section title="Payment Issues or Errors">
          <Text style={styles.text}>
            If you experience any issues with a payout or if a payment
            does not process correctly, please contact support so the
            issue can be investigated.
          </Text>

          <Text style={styles.text}>
            You may reach Melo support directly at:
          </Text>

          <Text style={styles.email}>
            support@melomarketplace.app
          </Text>
        </Section>

        <Text style={styles.footer}>
          Payout processing times may vary depending on banking
          institutions, payment providers, and regional regulations.
        </Text>
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 24,
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },

  text: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
    marginBottom: 10,
  },

  list: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
  },

  email: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#D97732",
  },

  footer: {
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
  },
})