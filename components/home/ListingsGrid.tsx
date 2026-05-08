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

import ListingCard, { Listing } from "./ListingCard"

type Props = {
  listings: Listing[]
  refreshing: boolean
  onRefresh: () => void
  onScrollOffsetChange?: (y: number) => void
  initialScrollOffset?: number
  onEndReached?: () => void
}

type GridRowItem = {
  type: "row"
  id: string
  listings: Listing[]
}

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
  onScrollOffsetChange,
  initialScrollOffset = 0,
  onEndReached,
}: Props) {
  const router = useRouter()

  const flatListRef =
    useRef<FlatList<GridRowItem>>(null)

  const hasRestoredScroll =
    useRef(false)

  const NUM_COLUMNS = 3

  /* ---------------- STABLE SHUFFLE ---------------- */

  const shuffledRef = useRef<Listing[]>([])

  const shuffledListings = useMemo(() => {
    // 🔥 INITIAL LOAD
    if (shuffledRef.current.length === 0) {
      shuffledRef.current =
        shuffleArray(listings)

      return shuffledRef.current
    }

    // 🔥 EXISTING IDS
    const existingIds = new Set(
      shuffledRef.current.map((l) => l.id)
    )

    // 🔥 ONLY NEW ITEMS
    const newItems = listings.filter(
      (l) => !existingIds.has(l.id)
    )

    if (newItems.length > 0) {
      const shuffledNew =
        shuffleArray(newItems)

      shuffledRef.current = [
        ...shuffledRef.current,
        ...shuffledNew,
      ]
    }

    return shuffledRef.current
  }, [listings])

  /* ---------------- BUILD ROWS ---------------- */

  const rows: GridRowItem[] = useMemo(() => {
    const builtRows: GridRowItem[] = []

    let rowIndex = 0

    for (
      let i = 0;
      i < shuffledListings.length;
      i += NUM_COLUMNS
    ) {
      const chunk = shuffledListings.slice(
        i,
        i + NUM_COLUMNS
      )

      builtRows.push({
        type: "row",
        id: `row-${rowIndex++}`,
        listings: chunk,
      })
    }

    return builtRows
  }, [shuffledListings])

  /* ---------------- RESTORE SCROLL ---------------- */

  useEffect(() => {
    if (!flatListRef.current) return
    if (hasRestoredScroll.current) return
    if (rows.length === 0) return

    if (
      !initialScrollOffset ||
      initialScrollOffset <= 0
    )
      return

    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: initialScrollOffset,
        animated: false,
      })

      hasRestoredScroll.current = true
    }, 50)

    return () => clearTimeout(timeout)
  }, [rows.length, initialScrollOffset])

  /* ---------------- RENDER ---------------- */

  return (
    <FlatList
      ref={flatListRef}

      data={rows}

      extraData={rows.length}

      keyExtractor={(item) => item.id}

      contentContainerStyle={styles.grid}

      showsVerticalScrollIndicator={false}

      initialNumToRender={20}

      maxToRenderPerBatch={12}

      windowSize={15}

      removeClippedSubviews={true}

      scrollEventThrottle={16}

      onEndReached={() => {
        onEndReached?.()
      }}

      onEndReachedThreshold={0.7}

      onScroll={(
        e: NativeSyntheticEvent<NativeScrollEvent>
      ) => {
        const y =
          e.nativeEvent.contentOffset.y

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
          return (
            <View style={styles.row}>
              {item.listings.map(
                (l, index) => (
                  <View
                    key={l.id}
                    style={[
                      styles.cardWrap,
                      {
                        marginRight:
                          index !==
                          NUM_COLUMNS - 1
                            ? 4
                            : 0,
                      },
                    ]}
                  >
                    <ListingCard
                      listing={l}
                      onPress={() =>
                        router.push(
                          `/listing/${l.id}`
                        )
                      }
                    />
                  </View>
                )
              )}

              {item.listings.length <
              NUM_COLUMNS
                ? Array.from({
                    length:
                      NUM_COLUMNS -
                      item.listings.length,
                  }).map((_, idx) => (
                    <View
                      key={idx}
                      style={styles.cardWrap}
                    />
                  ))
                : null}
            </View>
          )
        } catch (err) {
          console.log(
            "❌ ListingsGrid render error:",
            err
          )

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
})