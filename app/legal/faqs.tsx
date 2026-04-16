import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import React from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

export default function FAQsScreen() {
  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>
          FAQ'S
        </Text>

        <Section title="What is Melo?">
          <Text style={styles.text}>
            Melo is a peer-to-peer marketplace where people buy and sell
            directly with each other. Melo provides the platform, escrow
            payment protection, shipping tracking, and dispute tools that
            help keep transactions safer for both buyers and sellers.
          </Text>
        </Section>

        <Section title="How does buying work?">
          <Text style={styles.text}>
            Buying on Melo follows a secure transaction process:
          </Text>

          <Text style={styles.list}>
            • Buyer purchases an item{"\n"}
            • Payment is placed into escrow{"\n"}
            • Seller ships the item with tracking{"\n"}
            • Buyer receives and inspects the item{"\n"}
            • Funds are released once the order is completed
          </Text>
        </Section>

        <Section title="What is escrow?">
          <Text style={styles.text}>
            Escrow means the buyer's payment is securely held during the
            transaction instead of being sent directly to the seller.
          </Text>

          <Text style={styles.text}>
            The seller only receives payment after the order is completed
            or the inspection window ends.
          </Text>

          <Text style={styles.text}>
            This system helps prevent fraud and protects buyers if
            something goes wrong with the order.
          </Text>
        </Section>

        <Section title="When do I get charged?">
          <Text style={styles.text}>
            Buyers are charged at the time of purchase. The funds are held
            securely in escrow and are not released to the seller until the
            transaction is completed.
          </Text>
        </Section>

        <Section title="Can I return an item?">
          <Text style={styles.text}>
            Yes. During the inspection period after delivery, buyers may
            start a return directly from the order page.
          </Text>

          <Text style={styles.text}>
            Returns do not require seller approval during this inspection
            window. Buyers can simply select the return option and follow
            the return instructions.
          </Text>

          <Text style={styles.text}>
            This system significantly reduces disputes and helps protect
            buyers in peer-to-peer transactions.
          </Text>
        </Section>

        <Section title="What happens after delivery?">
          <Text style={styles.text}>
            Once an order is delivered, buyers have an inspection period
            to review their item.
          </Text>

          <Text style={styles.list}>
            • Confirm the order is complete{"\n"}
            • Start a return if necessary{"\n"}
            • Report a problem with the item
          </Text>

          <Text style={styles.text}>
            If no issues are reported, the payment is released to the
            seller automatically.
          </Text>
        </Section>

        <Section title="What if there is a problem with my order?">
          <Text style={styles.text}>
            If something is wrong with your order, you can report an issue
            directly from the order page. Buyers and sellers may submit
            evidence and communicate through the platform.
          </Text>
        </Section>

        <Section title="How do disputes work?">
          <Text style={styles.text}>
            If a problem cannot be resolved between the buyer and seller,
            a dispute can be opened.
          </Text>

          <Text style={styles.text}>
            Melo may review messages, listing details, shipping data,
            photos, and other evidence to determine a fair outcome.
          </Text>

          <Text style={styles.text}>
            Only one dispute may be opened per order.
          </Text>
        </Section>

        <Section title="When do sellers get paid?">
          <Text style={styles.text}>
            Sellers receive payment after:
          </Text>

          <Text style={styles.list}>
            • The buyer confirms the order is complete{"\n"}
            • The inspection window expires{"\n"}
            • Any dispute or return is resolved
          </Text>
        </Section>

        <Section title="What fees do buyers pay?">
          <Text style={styles.text}>
            Buyers pay a small Buyer Protection Fee which helps fund the
            escrow system and dispute protection tools.
          </Text>

          <Text style={styles.text}>
            The Buyer Protection Fee is currently 1.5% of the purchase
            price.
          </Text>

          <Text style={styles.text}>
            Standard payment processing fees and applicable sales taxes
            may also apply depending on the transaction.
          </Text>
        </Section>

        <Section title="What fees do sellers pay?">
          <Text style={styles.text}>
            Sellers pay a marketplace fee when an item sells on Melo.
          </Text>

          <Text style={styles.list}>
            • Standard sellers pay a 5% selling fee{"\n"}
            • Melo Pro members pay a reduced 3.5% selling fee
          </Text>
        </Section>

        <Section title="What are Boosts and Mega Boosts?">
          <Text style={styles.text}>
            Boosts and Mega Boosts are promotional tools sellers can use
            to increase the visibility of their listings.
          </Text>

          <Text style={styles.list}>
            • Boosts temporarily raise a listing higher in marketplace
            feeds{"\n"}
            • Mega Boosts place listings in highly visible featured
            areas
          </Text>

          <Text style={styles.text}>
            These tools help listings reach more potential buyers but do
            not guarantee a sale.
          </Text>
        </Section>

        <Section title="Does Melo inspect items?">
          <Text style={styles.text}>
            No. Melo does not physically inspect items. Listings and
            shipments are handled directly by independent sellers.
          </Text>
        </Section>

        <Section title="Is Melo responsible for lost or damaged items?">
          <Text style={styles.text}>
            Melo is not responsible for carrier delays, lost shipments, or
            shipping damage. However, disputes involving shipping issues
            may be reviewed using available evidence.
          </Text>
        </Section>

        <Section title="Is my payment information safe?">
          <Text style={styles.text}>
            Yes. Payments on Melo are processed by secure third-party
            payment providers. Melo does not store full credit card or
            payment credentials.
          </Text>
        </Section>

        <Section title="Can my account be suspended?">
          <Text style={styles.text}>
            Yes. Accounts may be suspended or permanently removed for
            fraudulent activity, abuse of the platform, or violations of
            marketplace policies.
          </Text>
        </Section>

        <Section title="How do I contact support?">
          <Text style={styles.text}>
            Support can be reached through in-app messaging or the support
            forms available within the app.
          </Text>
        </Section>

        <Text style={styles.footer}>
          These FAQs are provided for informational purposes and do not
          replace the Terms & Conditions of the platform.
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
      <Text style={styles.sectionTitle}>{title}</Text>
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