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

import UpgradeToProButton from "../pro/UpgradeToProButton"
import ListingCard, { Listing } from "./ListingCard"
import MegaBoostBlock from "./MegaBoostBlock"

/* ---------------- TYPES ---------------- */

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

/* ---------------- HELPERS ---------------- */

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

/* ---------------- COMPONENT ---------------- */

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
  const MEGA_BOOST_FREQUENCY = 4

  /* 🧠 SHUFFLE MEGA BOOSTS ONLY WHEN DATA CHANGES */

  const shuffledMegaBoosts = useMemo(() => {
    return shuffleArray(megaBoostListings)
  }, [megaBoostListings])

  /* ---------------- REMOVE MEGA BOOST LISTINGS FROM NORMAL GRID ---------------- */

  const megaIds = new Set(megaBoostListings.map((l) => l.id))
  const filteredListings = listings.filter((l) => !megaIds.has(l.id))

  /* ---------------- BUILD NORMAL GRID ROWS ---------------- */

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

  /* ---------------- INJECT MEGA BOOST ROWS ---------------- */

  const rows: GridRowItem[] = []
  let megaIndex = 0

  baseRows.forEach((row, index) => {
    rows.push(row)

    const shouldInsertMega =
      shuffledMegaBoosts.length > 0 &&
      (index + 1) % MEGA_BOOST_FREQUENCY === 0

    if (shouldInsertMega && megaIndex < shuffledMegaBoosts.length) {
      const megaSlice = shuffledMegaBoosts.slice(megaIndex, megaIndex + 1)

      rows.push({
        type: "mega_boost",
        id: `mega-boost-${index}`,
        listings: megaSlice,
      })

      megaIndex++
    }
  })

  /* 🔥 FALLBACK INSERTION (if feed is small) */

  while (megaIndex < shuffledMegaBoosts.length) {
    const megaSlice = shuffledMegaBoosts.slice(megaIndex, megaIndex + 1)

    rows.push({
      type: "mega_boost",
      id: `mega-boost-fallback-${megaIndex}`,
      listings: megaSlice,
    })

    megaIndex++
  }

  /* ---------------- INSERT UPGRADE ROW ---------------- */

  if (showUpgradeRow) {
    const insertAt = Math.min(4, rows.length)
    rows.splice(insertAt, 0, { type: "upgrade_row", id: "upgrade-row" })
  }

  /* 🧠 RESTORE SCROLL POSITION */

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

      /* 🔧 STABILIZE IMAGE RENDERING */
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
              <View style={styles.fullRow}>
                <MegaBoostBlock listings={item.listings} />
              </View>
            )
          }

          if (item.type === "upgrade_row") {
            return (
              <View style={styles.fullRow}>
                <UpgradeToProButton />
              </View>
            )
          }

          return (
            <View style={styles.row}>
              {item.listings.map((l) => (
                <View key={l.id} style={styles.cardWrap}>
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
                    <View
                      key={`spacer-${item.id}-${idx}`}
                      style={styles.cardWrap}
                    />
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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 3,
    paddingTop: 4,
    paddingBottom: 140,
  },
  row: {
    flexDirection: "row",
    gap: 4,
    width: "100%",
    marginBottom: 4,
  },
  cardWrap: {
    flex: 1,
  },
  fullRow: {
    width: "100%",
    paddingHorizontal: 3,
    marginVertical: 6,
  },
})