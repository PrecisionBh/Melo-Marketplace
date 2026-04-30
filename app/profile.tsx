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
import { FlatList, StyleSheet, View } from "react-native"

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<
    "listings" | "sent" | "received" | "reviews"
  >("listings")

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      {/* 🔥 SINGLE SCROLL OWNER */}
      <FlatList
        data={[{ id: "content" }]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}

        ListHeaderComponent={
          <>
            <ProfileHeaderCard />
            <ProfileWalletCard />
            <ProfileQuickActions />
            <ProfilePublicProfileButton />
            <ProfileTabs
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </>
        }

        renderItem={() => {
          if (activeTab === "listings") {
            return <ProfileListingsTab />
          }

          if (activeTab === "sent") {
            return <ProfileSentOffersTab />
          }

          if (activeTab === "received") {
            return <ProfileReceivedOffersTab />
          }

          if (activeTab === "reviews") {
            return <ProfileReviewsTab />
          }

          return null
        }}
      />

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  content: {
    paddingBottom: 120,
  },
})