import { useRouter } from "expo-router"
import { useEffect, useMemo, useRef } from "react"
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native"

import UpgradeToProCard from "../pro/UpgradeToProCard"
import ListingCard, { Listing } from "./ListingCard"
import MegaBoostBlock from "./MegaBoostBlock"

type Props = {
  listings: Listing[]
  refreshing: boolean
  onRefresh: () => void
  showUpgradeRow?: boolean
  megaBoostListings?: Listing[]
  onScrollOffsetChange?: (y: number) => void
  initialScrollOffset?: number
}

type GridRowItem =
  | { type: "row"; id: string; listings: Listing[] }
  | { type: "upgrade_row"; id: string }
  | { type: "mega_boost"; id: string; listings: Listing[] }

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function ListingsGrid({
  listings,
  refreshing,
  onRefresh,
  showUpgradeRow = false,
  megaBoostListings = [],
  onScrollOffsetChange,
  initialScrollOffset = 0,
}: Props) {
  const router = useRouter()

  const flatListRef = useRef<FlatList<GridRowItem>>(null)
  const hasRestoredScroll = useRef(false)

  const NUM_COLUMNS = 3
  const MEGA_BOOST_FREQUENCY = 9

  const shuffledMegaBoosts = useMemo(() => {
    return shuffleArray(megaBoostListings)
  }, [])

  const filteredListings = useMemo(() => {
    const megaIds = new Set(megaBoostListings.map((l) => l.id))
    return listings.filter((l) => !megaIds.has(l.id))
  }, [listings, megaBoostListings])

  const rows: GridRowItem[] = useMemo(() => {
    const baseRows: GridRowItem[] = []
    let rowIndex = 0

    for (let i = 0; i < filteredListings.length; i += NUM_COLUMNS) {
      const chunk = filteredListings.slice(i, i + NUM_COLUMNS)

      baseRows.push({
        type: "row",
        id: `row-${rowIndex++}`,
        listings: chunk,
      })
    }

    const builtRows: GridRowItem[] = []
    let megaIndex = 0

    baseRows.forEach((row, index) => {
      builtRows.push(row)

      const shouldInsertMega =
        shuffledMegaBoosts.length > 0 &&
        (index + 1) % MEGA_BOOST_FREQUENCY === 0

      if (shouldInsertMega && megaIndex < shuffledMegaBoosts.length) {
        builtRows.push({
          type: "mega_boost",
          id: `mega-boost-${index}`,
          listings: shuffledMegaBoosts.slice(megaIndex, megaIndex + 1),
        })

        megaIndex++
      }
    })

    while (megaIndex < shuffledMegaBoosts.length) {
      builtRows.push({
        type: "mega_boost",
        id: `mega-boost-fallback-${megaIndex}`,
        listings: shuffledMegaBoosts.slice(megaIndex, megaIndex + 1),
      })
      megaIndex++
    }

    if (showUpgradeRow && builtRows.length > 10) {
      builtRows.splice(10, 0, {
        type: "upgrade_row",
        id: "upgrade-row",
      })
    }

    return builtRows
  }, [filteredListings, shuffledMegaBoosts, showUpgradeRow])

  useEffect(() => {
    if (!flatListRef.current) return
    if (hasRestoredScroll.current) return
    if (rows.length === 0) return
    if (!initialScrollOffset || initialScrollOffset <= 0) return

    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: initialScrollOffset,
        animated: false,
      })
      hasRestoredScroll.current = true
    }, 50)

    return () => clearTimeout(timeout)
  }, [rows.length, initialScrollOffset])

  return (
    <FlatList
      ref={flatListRef}
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={10}
      removeClippedSubviews={false}
      scrollEventThrottle={16}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y
        onScrollOffsetChange?.(y)
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0F1E17"
        />
      }
      renderItem={({ item }) => {
        try {
          if (item.type === "mega_boost") {
            return (
              <View style={styles.megaWrapper}>
                <MegaBoostBlock listings={item.listings} />
              </View>
            )
          }

          if (item.type === "upgrade_row") {
            return (
              <View style={styles.fullRow}>
                <UpgradeToProCard />
              </View>
            )
          }

          return (
            <View style={styles.row}>
              {item.listings.map((l, index) => (
                <View
                  key={l.id}
                  style={[
                    styles.cardWrap,
                    { marginRight: index !== NUM_COLUMNS - 1 ? 4 : 0 },
                  ]}
                >
                  <ListingCard
                    listing={l}
                    onPress={() => router.push(`/listing/${l.id}`)}
                  />
                </View>
              ))}

              {item.listings.length < NUM_COLUMNS
                ? Array.from({
                    length: NUM_COLUMNS - item.listings.length,
                  }).map((_, idx) => (
                    <View key={idx} style={styles.cardWrap} />
                  ))
                : null}
            </View>
          )
        } catch {
          return null
        }
      }}
    />
  )
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 3,
    paddingTop: 4,
    paddingBottom: 140,
  },

  row: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 4,
  },

  cardWrap: {
    flex: 1,
  },

  /* 🔥 CLEAN FIX */
  megaWrapper: {
  width: "100%",
  height: 360,
  marginBottom: 26, // 🔥 increase bottom spacing
},

  fullRow: {
    width: "100%",
    paddingHorizontal: 3,
    marginVertical: 4,
  },
})