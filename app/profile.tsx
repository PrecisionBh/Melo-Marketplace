import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import ProfileHeaderCard from "@/components/profile/ProfileHeaderCard"
import ProfileListingsTab from "@/components/profile/ProfileListingsTab"
import ProfilePublicProfileButton from "@/components/profile/ProfilePublicProfileButton"
import ProfileQuickActions from "@/components/profile/ProfileQuickActions"
import ProfileReviewsTab from "@/components/profile/ProfileReviewsTab"
import ProfileTabs from "@/components/profile/ProfileTabs"
import ProfileWalletCard from "@/components/profile/ProfileWalletCard"

import { useState } from "react"

import {
  FlatList,
  StyleSheet,
  View,
} from "react-native"

type ProfileTab =
  | "listings"
  | "reviews"

export default function ProfileScreen() {
  const [activeTab, setActiveTab] =
    useState<ProfileTab>("listings")

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
          if (
            activeTab === "listings"
          ) {
            return (
              <ProfileListingsTab />
            )
          }

          if (
            activeTab === "reviews"
          ) {
            return (
              <ProfileReviewsTab />
            )
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