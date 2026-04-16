import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import React from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

export default function ContactScreen() {
  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageTitle}>
          Contact Support
        </Text>

        <Section title="Contact Melo Support">
          <Text style={styles.text}>
            If you need assistance with an order, payment, dispute,
            listing, or account issue, the Melo support team is here to help.
          </Text>

          <Text style={styles.text}>
            The fastest way to reach support is by email.
          </Text>
        </Section>

        <Section title="Support Email">
          <Text style={styles.email}>
            support@melomarketplace.app
          </Text>
        </Section>

        <Section title="What to Include in Your Message">
          <Text style={styles.text}>
            To help us resolve your issue as quickly as possible,
            please include the following details in your email:
          </Text>

          <Text style={styles.list}>
            • Your Melo account email{"\n"}
            • Order ID (if your issue is related to an order){"\n"}
            • A short description of the issue{"\n"}
            • Any relevant screenshots or photos
          </Text>
        </Section>

        <Section title="Support Response Time">
          <Text style={styles.text}>
            Most support requests are reviewed and responded to within
            24–48 hours.
          </Text>

          <Text style={styles.text}>
            During periods of high activity, response times may vary.
          </Text>
        </Section>

        <Section title="Order Issues">
          <Text style={styles.text}>
            If your request is related to an order, please include your
            Melo Order ID in your email. This helps our support team
            locate the transaction and resolve the issue faster.
          </Text>
        </Section>

        <Text style={styles.footer}>
          Melo support assists with platform-related issues including
          orders, payments, disputes, listings, and technical problems.
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