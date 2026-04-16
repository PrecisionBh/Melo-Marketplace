import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import React from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageTitle}>
          Privacy Policy
        </Text>

        <Section title="1. Introduction">
          <Text style={styles.text}>
            Melo (“Melo”, “we”, “our”, or “us”) respects your privacy and
            is committed to protecting your personal information.
          </Text>

          <Text style={styles.text}>
            This Privacy Policy explains how we collect, use, store,
            and protect information when you use the Melo marketplace.
          </Text>
        </Section>

        <Section title="2. Information We Collect">
          <Text style={styles.text}>
            When you use Melo, we may collect certain information including:
          </Text>

          <Text style={styles.list}>
            • Account information (name, email, profile details){"\n"}
            • Listing information and product descriptions{"\n"}
            • Photos or images uploaded to listings or disputes{"\n"}
            • Messages sent through the platform{"\n"}
            • Order and transaction information{"\n"}
            • Device or usage information related to app activity
          </Text>
        </Section>

        <Section title="3. Payment Information">
          <Text style={styles.text}>
            Payments on Melo are processed through secure third-party
            payment providers such as Stripe.
          </Text>

          <Text style={styles.text}>
            Melo does not store full credit card numbers or payment
            credentials. Payment processors manage financial data
            and transaction security.
          </Text>
        </Section>

        <Section title="4. How We Use Information">
          <Text style={styles.text}>
            Information collected may be used to:
          </Text>

          <Text style={styles.list}>
            • Operate and maintain the marketplace{"\n"}
            • Process transactions and escrow payments{"\n"}
            • Provide dispute resolution services{"\n"}
            • Improve platform features and performance{"\n"}
            • Communicate important updates or support responses{"\n"}
            • Prevent fraud and maintain marketplace safety
          </Text>
        </Section>

        <Section title="5. Marketplace Content">
          <Text style={styles.text}>
            Listings, images, and certain profile information may be
            visible to other users of the platform in order to facilitate
            marketplace activity.
          </Text>

          <Text style={styles.text}>
            Users should avoid posting sensitive personal information
            within listings or messages.
          </Text>
        </Section>

        <Section title="6. Data Security">
          <Text style={styles.text}>
            Melo implements reasonable security measures to protect
            user information and platform data.
          </Text>

          <Text style={styles.text}>
            While we take steps to safeguard data, no online system can
            guarantee absolute security.
          </Text>
        </Section>

        <Section title="7. Data Sharing">
          <Text style={styles.text}>
            Melo does not sell personal information to third parties.
          </Text>

          <Text style={styles.text}>
            Information may be shared with trusted service providers
            when necessary to operate the platform, including payment
            processors and hosting services.
          </Text>
        </Section>

        <Section title="8. User Responsibilities">
          <Text style={styles.text}>
            Users are responsible for maintaining the security of their
            accounts and passwords.
          </Text>

          <Text style={styles.text}>
            If you believe your account has been compromised, please
            contact support immediately.
          </Text>
        </Section>

        <Section title="9. Children's Privacy">
          <Text style={styles.text}>
            Melo is not intended for children. Users must be at least
            18 years old to sell items on the platform.
          </Text>
        </Section>

        <Section title="10. Changes to This Policy">
          <Text style={styles.text}>
            Melo may update this Privacy Policy from time to time.
            Continued use of the platform after updates constitutes
            acceptance of the revised policy.
          </Text>
        </Section>

        <Section title="11. Contact">
          <Text style={styles.text}>
            For questions regarding this Privacy Policy, please contact:
          </Text>

          <Text style={styles.list}>
            support@melomarketplace.app
          </Text>
        </Section>

        <Section title="12. Your Rights">
          <Text style={styles.text}>
            You have the right to access, update, or delete your personal information.
          </Text>

          <Text style={styles.text}>
            You may request account deletion at any time through the app or by contacting support.
          </Text>

          <Text style={styles.text}>
            We will respond to data requests in accordance with applicable laws.
          </Text>
        </Section>

        <Section title="13. Data Retention">
          <Text style={styles.text}>
            Melo retains user information only as long as necessary to provide services,
            comply with legal obligations, resolve disputes, and enforce agreements.
          </Text>
        </Section>

        <Section title="14. Third-Party Services">
          <Text style={styles.text}>
            Melo uses third-party services including payment processors, hosting providers,
            and analytics tools to operate the platform.
          </Text>

          <Text style={styles.text}>
            These providers may process data in accordance with their own privacy policies.
          </Text>
        </Section>

        <Section title="15. Tracking and Analytics">
          <Text style={styles.text}>
            Melo may use limited analytics or diagnostic tools to improve app performance.
          </Text>

          <Text style={styles.text}>
            Melo does not use invasive tracking or sell user data for advertising purposes.
          </Text>
        </Section>

        <Section title="16. Regional Privacy Rights">
          <Text style={styles.text}>
            Depending on your location, you may have additional rights under laws such as
            the California Consumer Privacy Act (CCPA) or General Data Protection Regulation (GDPR).
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