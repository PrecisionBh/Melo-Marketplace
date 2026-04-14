import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import ProfileHeaderCard from "@/components/profile/ProfileHeaderCard"
import ProfileListingsTab from "@/components/profile/ProfileListingsTab"
import ProfilePublicProfileButton from "@/components/profile/ProfilePublicProfileButton"
import ProfileQuickActions from "@/components/profile/ProfileQuickActions"
import ProfileReceivedOffersTab from "@/components/profile/ProfileReceivedOffersTab"
import ProfileReviewsTab from "@/components/profile/ProfileReviewsTab"
import ProfileSentOffersTab from "@/components/profile/ProfileSentOffersTab"
import ProfileTabs from "@/components/profile/ProfileTabs"
import ProfileWalletCard from "@/components/profile/ProfileWalletCard"
import { useState } from "react"
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native"

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<
    "listings" | "sent" | "received" | "reviews"
  >("listings")

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeaderCard />

        <ProfileWalletCard />

        <ProfileQuickActions />

        <ProfilePublicProfileButton />

        <ProfileTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "listings" && (
          <ProfileListingsTab />
        )}

        {activeTab === "sent" && (
          <ProfileSentOffersTab />
        )}

        {activeTab === "received" && (
          <ProfileReceivedOffersTab />
        )}

        {activeTab === "reviews" && (
          <ProfileReviewsTab />
        )}
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  content: {
    paddingBottom: 120,
  },
})