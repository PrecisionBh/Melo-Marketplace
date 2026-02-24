import { Ionicons } from "@expo/vector-icons"
import { useEffect, useRef } from "react"
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

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

  // ✨ Faint gold star twinkle animation (subtle luxury)
  const starOpacity1 = useRef(new Animated.Value(0.2)).current
  const starOpacity2 = useRef(new Animated.Value(0.1)).current
  const starOpacity3 = useRef(new Animated.Value(0.15)).current

  useEffect(() => {
    const twinkle = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.15,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      )

    const a1 = twinkle(starOpacity1, 0)
    const a2 = twinkle(starOpacity2, 600)
    const a3 = twinkle(starOpacity3, 1200)

    a1.start()
    a2.start()
    a3.start()

    return () => {
      a1.stop()
      a2.stop()
      a3.stop()
    }
  }, [starOpacity1, starOpacity2, starOpacity3])

  return (
    <View style={styles.wrapper}>
      <View style={styles.hero}>
        {/* Soft green cinematic glow */}
        <View style={styles.glow} />

        {/* ✨ GOLD TWINKLE STARS (VERY FAINT) */}
        <Animated.Text
          style={[styles.star, styles.starOne, { opacity: starOpacity1 }]}
        >
          ✦
        </Animated.Text>
        <Animated.Text
          style={[styles.star, styles.starTwo, { opacity: starOpacity2 }]}
        >
          ✧
        </Animated.Text>
        <Animated.Text
          style={[styles.star, styles.starThree, { opacity: starOpacity3 }]}
        >
          ✦
        </Animated.Text>

        {/* Trophy Icon */}
        <View style={styles.crownWrap}>
          <Ionicons name="trophy-outline" size={20} color="#FFD700" />
        </View>

        {/* MELO PRO BADGE */}
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>MELO PRO</Text>
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

        {/* STATS */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            onPress={onOpenReviews}
            disabled={!hasReviews}
            activeOpacity={hasReviews ? 0.7 : 1}
          >
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {hasReviews ? `${ratingAvg} ★` : "—"}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
              {hasReviews && (
                <Text style={styles.statSub}>
                  {ratingCount} reviews
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>{soldCount}</Text>
            <Text style={styles.statLabel}>Sold</Text>
            <Text style={styles.statSub}>completed</Text>
          </View>
        </View>

        {/* BIO */}
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}

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
    marginBottom: 18,
  },

  hero: {
    width: "100%",
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 18,
    backgroundColor: "#0B1511",
    alignItems: "center",
    overflow: "hidden",
  },

  glow: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#7FAF9B",
    opacity: 0.18,
  },

  /* ✨ STAR POSITIONS (VERY SUBTLE) */
  star: {
    position: "absolute",
    color: "#FFD700",
    fontSize: 16,
  },
  starOne: {
    top: 40,
    left: 30,
  },
  starTwo: {
    top: 90,
    right: 50,
  },
  starThree: {
    top: 150,
    left: 70,
  },

  crownWrap: {
    position: "absolute",
    top: 18,
    right: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
  },

  proBadge: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },

  proBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFD700",
    letterSpacing: 1.6,
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: "#FFD700",
    marginBottom: 12,
  },

  name: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 22,
  },

  stat: {
    alignItems: "center",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFD700",
  },

  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    marginTop: 2,
  },

  statSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },

  bio: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
    width: "100%",
  },

  followButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 20,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },

  followingButton: {
    backgroundColor: "#1A2A23",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  followText: {
    color: "#0B1511",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.4,
  },

  messageButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 20,
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
    letterSpacing: 0.4,
  },
})