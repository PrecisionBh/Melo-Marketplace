import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import React from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

export default function TermsScreen() {
  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageTitle}>
          Terms & Conditions
        </Text>

        <Section title="1. Acceptance of Terms">
          <Text style={styles.text}>
            By accessing or using the Melo
            marketplace (“Melo”, “we”,
            “our”, or “us”), you agree to
            be bound by these Terms &
            Conditions.
          </Text>
        </Section>

        <Section title="2. Eligibility">
          <Text style={styles.text}>
            Users must be at least 18 years
            old to sell items or receive
            payouts.
          </Text>
        </Section>

        <Section title="3. Marketplace Role">
          <Text style={styles.text}>
            Melo is a peer-to-peer platform
            connecting buyers and sellers.
            Melo is not a seller, buyer, or
            financial institution.
          </Text>
        </Section>

        <Section title="4. Listings & Seller Responsibilities">
          <Text style={styles.list}>
            • Listings must be accurate{"\n"}
            • Items must be legally owned{"\n"}
            • Orders must be shipped with
            tracking
          </Text>
        </Section>

        <Section title="5. Prohibited Activity">
          <Text style={styles.list}>
            • Illegal or stolen goods{"\n"}
            • Counterfeits{"\n"}
            • Fraud or misrepresentation{"\n"}
            • Off-platform payments
          </Text>
        </Section>

        <Section title="6. Payments & Escrow">
          <Text style={styles.text}>
            Payments are processed via
            third-party providers and held
            in escrow until transactions are
            completed.
          </Text>
        </Section>

        <Section title="7. Returns & Disputes">
          <Text style={styles.text}>
            Buyers may initiate returns
            within the inspection period.
            Melo may resolve disputes based
            on available evidence.
          </Text>
        </Section>

        <Section title="8. Fees">
          <Text style={styles.list}>
            • Seller fee: 5%{"\n"}
            • Pro fee: 3.5%{"\n"}
            • Buyer protection: 1.5%
          </Text>
        </Section>

        <Section title="9. Subscriptions & Digital Purchases">
          <Text style={styles.text}>
            Melo Pro subscriptions
            automatically renew unless
            canceled. Subscription
            management is handled through
            your app store account.
          </Text>

          <Text style={styles.text}>
            Boosts and promotional tools are
            digital services and are
            non-refundable once activated
            unless otherwise stated.
          </Text>
        </Section>

        <Section title="10. Refund Policy">
          <Text style={styles.text}>
            Marketplace transactions are
            subject to return and dispute
            policies. Digital purchases and
            subscription fees are generally
            non-refundable except where
            required by law or platform
            policy.
          </Text>
        </Section>

        <Section title="11. Account Termination">
          <Text style={styles.text}>
            Users may delete their account
            at any time.
          </Text>

          <Text style={styles.text}>
            Melo may suspend or terminate
            accounts for violations, fraud,
            or abuse of the platform.
          </Text>
        </Section>

        <Section title="12. Privacy">
          <Text style={styles.text}>
            Use of Melo is also governed by
            our Privacy Policy.
          </Text>
        </Section>

        <Section title="13. Disclaimer">
          <Text style={styles.text}>
            Melo is provided “as is”
            without warranties of any kind.
          </Text>
        </Section>

        <Section title="14. Limitation of Liability">
          <Text style={styles.text}>
            Melo is not liable for indirect
            or consequential damages arising
            from use of the platform.
          </Text>
        </Section>

        <Section title="15. Indemnification">
          <Text style={styles.text}>
            Users agree to indemnify Melo
            against claims arising from
            misuse.
          </Text>
        </Section>

        <Section title="16. Governing Law">
          <Text style={styles.text}>
            These Terms are governed by
            applicable laws of operation.
          </Text>
        </Section>

        <Section title="17. Force Majeure">
          <Text style={styles.text}>
            Melo is not liable for failures
            due to events outside its
            control, including outages,
            natural disasters, or service
            disruptions.
          </Text>
        </Section>

        <Section title="18. Changes">
          <Text style={styles.text}>
            Continued use of Melo
            constitutes acceptance of
            updated terms.
          </Text>
        </Section>

        <Section title="19. Contact">
          <Text style={styles.text}>
            support@melomarketplace.app
          </Text>
        </Section>

        <Text style={styles.footer}>
          Last updated: {new Date().getFullYear()}
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

  footer: {
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
  },
})