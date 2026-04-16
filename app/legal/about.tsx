import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import React from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

export default function AboutMeloScreen() {
  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageTitle}>
          About Melo
        </Text>

        <Section title="What is Melo?">
          <Text style={styles.text}>
            Melo is a peer-to-peer marketplace
            where people buy and sell directly
            with each other. Melo provides the
            platform, payment protection, and
            dispute tools that help keep both
            buyers and sellers safe during
            transactions.
          </Text>

          <Text style={styles.text}>
            Sellers list items for sale. Buyers
            purchase those items. Melo manages
            the order process, payment
            protection, and communication tools
            so both parties can complete the
            transaction with more confidence.
          </Text>
        </Section>

        <Section title="Our Mission">
          <Text style={styles.text}>
            Our mission is to make online
            peer-to-peer transactions safer,
            simpler, and more transparent.
          </Text>

          <Text style={styles.text}>
            Melo was built to reduce scams,
            confusion, and uncertainty when
            buying or selling online.
          </Text>
        </Section>

        <Section title="How Melo Works">
          <Text style={styles.text}>
            Melo connects buyers and sellers
            directly using escrow-based
            payments:
          </Text>

          <Text style={styles.list}>
            • Buyer purchases item{"\n"}
            • Payment held in escrow{"\n"}
            • Seller ships with tracking{"\n"}
            • Buyer receives item{"\n"}
            • Funds released upon completion
          </Text>
        </Section>

        <Section title="What Escrow Means">
          <Text style={styles.text}>
            Escrow means buyer funds are held
            securely while the transaction is
            completed.
          </Text>

          <Text style={styles.text}>
            Payment is only released once the
            order is successfully fulfilled.
          </Text>
        </Section>

        <Section title="Marketplace Fees">
          <Text style={styles.list}>
            • Standard Sellers: 5% Fee{"\n"}
            • Melo Pro Sellers: 1% Fee
          </Text>

          <Text style={styles.text}>
            These fees help support escrow,
            dispute systems, and continued
            marketplace development.
          </Text>
        </Section>

        <Section title="Boosts & Visibility">
          <Text style={styles.text}>
            Sellers can purchase Boosts and
            Mega Boosts to increase listing
            visibility across marketplace
            feeds.
          </Text>
        </Section>

        <Section title="Trust & Transparency">
          <Text style={styles.text}>
            Melo provides order tracking,
            communication tools, shipping
            updates, and structured dispute
            handling to improve marketplace
            trust.
          </Text>
        </Section>

        <Section title="Payments & Security">
          <Text style={styles.text}>
            Payments are processed securely
            through third-party providers.
            Melo does not store full card
            details.
          </Text>
        </Section>

        <Section title="Our Commitment">
          <Text style={styles.text}>
            We are committed to improving
            marketplace safety, transparency,
            and user experience as Melo grows.
          </Text>
        </Section>
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
})