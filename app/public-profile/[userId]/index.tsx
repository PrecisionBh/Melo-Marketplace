import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import PublicProfileActions from "@/components/public-profile/PublicProfileActions"
import PublicProfileHeader from "@/components/public-profile/PublicProfileHeader"
import PublicProfileListings from "@/components/public-profile/PublicProfileListings"
import PublicProfileStats from "@/components/public-profile/PublicProfileStats"

import { supabase } from "@/lib/supabase"

type Profile = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_pro?: boolean
}

export default function PublicProfileScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const { session } = useAuth()

  const routeUserId =
    typeof params.userId === "string"
      ? params.userId
      : Array.isArray(params.userId)
      ? params.userId[0]
      : undefined

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [isFollowing, setIsFollowing] =
    useState<boolean>(false)

  const [followLoading, setFollowLoading] =
    useState(false)

  const [messageLoading, setMessageLoading] =
    useState(false)

  const [soldCount, setSoldCount] =
    useState(0)

  const [ratingAvg, setRatingAvg] =
    useState<number | null>(null)

  const [ratingCount, setRatingCount] =
    useState(0)

  useEffect(() => {
    if (!routeUserId) return
    loadAll()
  }, [routeUserId])

  const loadAll = async () => {
    try {
      setLoading(true)

      const profileData =
        await loadProfile()

      await Promise.all([
        loadSales(),
        loadRatings(),
      ])

      if (
        profileData &&
        session?.user?.id
      ) {
        await loadFollowState(
          profileData.id
        )
      }
    } catch (err) {
      console.log(
        "Public profile load error:",
        err
      )
    } finally {
      setLoading(false)
    }
  }

  const loadProfile = async () => {
    const { data, error } =
      await supabase
        .from("profiles")
        .select(
          "id, display_name, bio, avatar_url, is_pro"
        )
        .eq("id", routeUserId)
        .single()

    if (!error && data) {
      setProfile(data)
      return data
    } else {
      setProfile(null)
      return null
    }
  }

  const loadSales = async () => {
    const { count } =
      await supabase
        .from("orders")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "seller_id",
          routeUserId
        )
        .eq("status", "completed")

    setSoldCount(count ?? 0)
  }

  const loadRatings = async () => {
    const { data } =
      await supabase
        .from("ratings")
        .select("rating")
        .eq(
          "to_user_id",
          routeUserId
        )

    if (data && data.length > 0) {
      const total = data.reduce(
        (sum, r) =>
          sum + r.rating,
        0
      )

      setRatingAvg(
        Number(
          (
            total / data.length
          ).toFixed(1)
        )
      )

      setRatingCount(data.length)
    } else {
      setRatingAvg(null)
      setRatingCount(0)
    }
  }

  const loadFollowState =
    async (profileId: string) => {
      const { data } =
        await supabase
          .from("followers")
          .select("id")
          .eq(
            "follower_id",
            session!.user.id
          )
          .eq(
            "following_id",
            profileId
          )
          .maybeSingle()

      setIsFollowing(!!data)
    }

  const handleFollowToggle =
    async () => {
      if (
        !session?.user?.id ||
        !profile?.id
      )
        return

      try {
        setFollowLoading(true)

        if (isFollowing) {
          await supabase
            .from("followers")
            .delete()
            .eq(
              "follower_id",
              session.user.id
            )
            .eq(
              "following_id",
              profile.id
            )

          setIsFollowing(false)
        } else {
          await supabase
            .from("followers")
            .insert({
              follower_id:
                session.user.id,
              following_id:
                profile.id,
            })

          setIsFollowing(true)
        }
      } catch (err) {
        console.log(
          "Follow error:",
          err
        )
      } finally {
        setFollowLoading(false)
      }
    }

  const handleMessage =
    async () => {
      if (
        !session?.user?.id ||
        !profile?.id
      )
        return

      if (messageLoading) return

      try {
        setMessageLoading(true)

        const { data: existing } =
          await supabase
            .from("conversations")
            .select("id")
            .or(
              `and(user_one.eq.${session.user.id},user_two.eq.${profile.id}),and(user_one.eq.${profile.id},user_two.eq.${session.user.id})`
            )
            .maybeSingle()

        let conversationId =
          existing?.id

        if (!conversationId) {
          const {
            data: newConv,
          } = await supabase
            .from(
              "conversations"
            )
            .insert({
              user_one:
                session.user.id,
              user_two:
                profile.id,
            })
            .select("id")
            .single()

          conversationId =
            newConv?.id
        }

        if (conversationId) {
          router.replace(
            `/messages/${conversationId}`
          )
        }
      } catch (err) {
        console.log(
          "Message error:",
          err
        )
      } finally {
        setTimeout(
          () =>
            setMessageLoading(false),
          500
        )
      }
    }

  if (loading) {
    return (
      <View style={styles.screen}>
        <GlobalHeader />

        <ActivityIndicator
          style={{
            marginTop: 60,
          }}
        />

        <GlobalFooter />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <FlatList
        data={[{ id: "profile" }]}
        keyExtractor={(item) =>
          item.id
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
        ListHeaderComponent={
          profile ? (
            <>
              <PublicProfileHeader
                displayName={
                  profile.display_name
                }
                bio={profile.bio}
                avatarUrl={
                  profile.avatar_url
                }
                isPro={
                  profile.is_pro
                }
              />

              <PublicProfileStats
                soldCount={
                  soldCount
                }
                ratingAvg={
                  ratingAvg
                }
                ratingCount={
                  ratingCount
                }
              />

              <PublicProfileActions
                isFollowing={
                  isFollowing
                }
                loading={
                  followLoading
                }
                messageLoading={
                  messageLoading
                }
                onFollowToggle={
                  handleFollowToggle
                }
                onMessage={
                  handleMessage
                }
              />
            </>
          ) : null
        }
        renderItem={() =>
  profile ? (
    <View style={styles.listingsWrap}>
      <PublicProfileListings
        userId={profile.id}
      />
    </View>
  ) : null
}
      />

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
    paddingBottom: 100,
  },

listingsWrap: {
  marginTop: 18,
  paddingHorizontal: 12,
},

})