import { Ionicons } from "@expo/vector-icons"
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  displayName: string | null
  avatarUrl: string | null
  bio?: string | null
  isOwnProfile: boolean
  isFollowing: boolean
  followLoading: boolean
  ratingAvg: number | null
  ratingCount: number
  soldCount: number
  onFollowToggle: () => void
  onMessage: () => void
  onOpenReviews: () => void
}

export default function ProProfileHero({
  displayName,
  avatarUrl,
  bio,
  isOwnProfile,
  isFollowing,
  followLoading,
  ratingAvg,
  ratingCount,
  soldCount,
  onFollowToggle,
  onMessage,
  onOpenReviews,
}: Props) {
  const hasReviews = ratingCount > 0

  return (
    <View style={styles.wrapper}>
      {/* 👑 FULL WIDTH PREMIUM HERO */}
      <View style={styles.hero}>
        {/* Glow Accent */}
        <View style={styles.glow} />

        {/* 👑 Crown Top Right */}
        <View style={styles.crownWrap}>
  <Ionicons name="trophy-outline" size={20} color="#FFD700" />
</View>

        {/* PRO SELLER TITLE */}
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO SELLER</Text>
        </View>

        {/* AVATAR */}
        <Image
          source={
            avatarUrl
              ? { uri: avatarUrl }
              : require("@/assets/images/avatar-placeholder.png")
          }
          style={styles.avatar}
        />

        {/* NAME */}
        <Text style={styles.name}>
          {displayName ?? "User"}
        </Text>

        {/* ⭐ GOLD RATING + STATS */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            onPress={onOpenReviews}
            disabled={!hasReviews}
            activeOpacity={hasReviews ? 0.7 : 1}
          >
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {hasReviews ? `${ratingAvg} ★` : "No reviews"}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
              {hasReviews && (
                <Text style={styles.statSub}>
                  {ratingCount} reviews
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.stat}>
            <Text style={styles.statValue}>{soldCount}</Text>
            <Text style={styles.statLabel}>Sold</Text>
            <Text style={styles.statSub}>completed</Text>
          </View>
        </View>

        {/* BIO INSIDE HERO (PREMIUM FEEL) */}
        {bio ? (
          <Text style={styles.bio}>{bio}</Text>
        ) : null}

        {/* ACTION BUTTONS */}
        {!isOwnProfile && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={onFollowToggle}
              disabled={followLoading}
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
            >
              <Text style={styles.followText}>
                {followLoading
                  ? "Loading..."
                  : isFollowing
                  ? "Following"
                  : "Follow Seller"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onMessage}
              style={styles.messageButton}
              activeOpacity={0.9}
            >
              <Text style={styles.messageText}>
                Message Seller
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },

  hero: {
    width: "100%", // FULL WIDTH (not card)
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 18,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    overflow: "hidden",
  },

  glow: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#7FAF9B",
    opacity: 0.25,
  },

  crownWrap: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 8,
    borderRadius: 999,
  },

  proBadge: {
    backgroundColor: "#BFE7D4",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },

  proBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 1.2,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: "#7FAF9B",
    marginBottom: 10,
  },

  name: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 16,
  },

  stat: {
    alignItems: "center",
    marginHorizontal: 18,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFD700", // ⭐ GOLD RATING STYLE
  },

  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
  },

  statSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },

  bio: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 6,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },

  followButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  followingButton: {
    backgroundColor: "#1C2E27",
  },

  followText: {
    color: "#0F1E17",
    fontWeight: "900",
    fontSize: 14,
  },

  messageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  messageText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
})