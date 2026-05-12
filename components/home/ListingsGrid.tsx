import { useRouter } from "expo-router"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"

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

const NUM_COLUMNS = 3
const ROW_HEIGHT = 210

function ListingsGrid({
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

  /* ---------------- NAVIGATION ---------------- */

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/listing/${id}`)
    },
    [router]
  )

  /* ---------------- BUILD ROWS ---------------- */

  const rows: GridRowItem[] = useMemo(() => {
    const builtRows: GridRowItem[] = []

    let rowIndex = 0

    for (
      let i = 0;
      i < listings.length;
      i += NUM_COLUMNS
    ) {
      builtRows.push({
        type: "row",
        id: `row-${rowIndex++}`,
        listings: listings.slice(
          i,
          i + NUM_COLUMNS
        ),
      })
    }

    return builtRows
  }, [listings])

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

  /* ---------------- RENDER ROW ---------------- */

  const renderRow = useCallback(
    ({
      item,
    }: {
      item: GridRowItem
    }) => {
      try {
        return (
          <View style={styles.row}>
            {item.listings.map(
              (l, index) => (
                <View
                  key={l.id}
                  style={[
                    styles.cardWrap,
                    index !==
                      NUM_COLUMNS - 1 && {
                      marginRight: 4,
                    },
                  ]}
                >
                  <ListingCard
                    listing={l}
                    onPress={() =>
                      handlePress(l.id)
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
    },
    [handlePress]
  )

  /* ---------------- RENDER ---------------- */

  return (
    <FlatList
      ref={flatListRef}
      data={rows}
      renderItem={renderRow}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.grid}
      scrollEventThrottle={16}
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews={false}
      onEndReachedThreshold={0.7}
      onEndReached={onEndReached}
      getItemLayout={(_, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
      onScroll={(
        e: NativeSyntheticEvent<NativeScrollEvent>
      ) => {
        onScrollOffsetChange?.(
          e.nativeEvent.contentOffset.y
        )
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0F1E17"
        />
      }
    />
  )
}

export default memo(ListingsGrid)

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