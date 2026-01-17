import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React from "react"

import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function AboutMeloScreen() {
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

        <Text style={styles.headerTitle}>About Melo</Text>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="What is Melo?">
          <Text style={styles.text}>
            Melo is a peer-to-peer marketplace designed to make buying and
            selling safer, simpler, and more transparent.
          </Text>
        </Section>

        <Section title="Our Mission">
          <Text style={styles.text}>
            Our mission is to reduce risk, confusion, and friction in online
            transactions by combining escrow-based payments, shipment tracking,
            and clear dispute processes — all in one place.
          </Text>
        </Section>

        <Section title="How Melo Works">
          <Text style={styles.text}>
            Melo connects buyers and sellers directly. When an order is placed:
          </Text>

          <Text style={styles.list}>
            • Buyer payment is securely held in escrow{"\n"}
            • Seller ships the item with tracking{"\n"}
            • Buyer receives and inspects the item{"\n"}
            • Funds are released once the order is completed
          </Text>
        </Section>

        <Section title="What Melo Is Not">
          <Text style={styles.text}>
            Melo does not own, store, or physically inspect items listed on the
            platform. All listings and shipments are handled by independent
            sellers.
          </Text>
        </Section>

        <Section title="Trust & Transparency">
          <Text style={styles.text}>
            Melo is built with transparency at its core. Buyers and sellers can
            track order status, shipping updates, and communication history
            directly within the app.
          </Text>
        </Section>

        <Section title="Disputes & Protection">
          <Text style={styles.text}>
            When issues arise, Melo provides structured tools to report problems
            and escalate disputes when necessary. Our goal is fair resolution
            based on evidence, communication, and platform policies.
          </Text>
        </Section>

        <Section title="Community Responsibility">
          <Text style={styles.text}>
            Melo depends on honest participation from its users. Fraud,
            misrepresentation, or abuse of the platform may result in account
            suspension or removal.
          </Text>
        </Section>

        <Section title="Payments & Security">
          <Text style={styles.text}>
            Payments on Melo are processed using secure third-party payment
            providers. Melo does not store full payment credentials.
          </Text>
        </Section>

        <Section title="Our Commitment">
          <Text style={styles.text}>
            We are committed to continuously improving Melo based on user
            feedback, platform integrity, and evolving marketplace needs.
          </Text>
        </Section>

        <Section title="Contact & Support">
          <Text style={styles.text}>
            For support, questions, or feedback, users can contact Melo through
            in-app messaging or official support channels.
          </Text>
        </Section>

        <Text style={styles.footer}>
          Melo is an independent marketplace platform. Use of the app is subject
          to the Terms & Conditions and applicable policies.
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
    textAlign: "center",
    paddingHorizontal: 24,
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
