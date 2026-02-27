import { useRouter } from "expo-router";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import UpgradeToProButton from "../pro/UpgradeToProButton";
import ListingCard, { Listing } from "./ListingCard";
import MegaBoostBlock from "./MegaBoostBlock"; // 👑 NEW

/* 🧠 DEBUG IMPORT LOGS (CRITICAL FOR INVALID ELEMENT ERROR) */
console.log("🧩 ListingsGrid loaded")
console.log("🧩 ListingCard import:", ListingCard)
console.log("🧩 UpgradeToProButton import:", UpgradeToProButton)
console.log("🧩 MegaBoostBlock import:", MegaBoostBlock)

/* ---------------- TYPES ---------------- */

type Props = {
  listings: Listing[]
  refreshing: boolean
  onRefresh: () => void
  showUpgradeRow?: boolean
  megaBoostListings?: Listing[] // 👑 NEW
}

type GridRowItem =
  | { type: "row"; id: string; listings: Listing[] }
  | { type: "upgrade_row"; id: string }
  | { type: "mega_boost"; id: string; listings: Listing[] } // 👑 NEW

/* ---------------- COMPONENT ---------------- */

export default function ListingsGrid({
  listings,
  refreshing,
  onRefresh,
  showUpgradeRow = false,
  megaBoostListings = [],
}: Props) {
  const router = useRouter()

  console.log("📦 ListingsGrid render start")
  console.log("📦 listings length:", listings?.length)
  console.log("📦 megaBoostListings length:", megaBoostListings?.length)
  console.log("📦 showUpgradeRow:", showUpgradeRow)

  const NUM_COLUMNS = 3
  const MEGA_BOOST_FREQUENCY =  6 // 👑 Every 8th row

  // ✅ Build rows of 3 listings each
  const baseRows: GridRowItem[] = []
  let rowIndex = 0

  for (let i = 0; i < listings.length; i += NUM_COLUMNS) {
    const chunk = listings.slice(i, i + NUM_COLUMNS)
    baseRows.push({
      type: "row",
      id: `row-${rowIndex++}`,
      listings: chunk,
    })
  }

  console.log("🧱 Base rows built:", baseRows.length)

  // 👑 Inject Mega Boost rows every 8th row (without breaking grid)
  const rows: GridRowItem[] = []
  let megaIndex = 0

  baseRows.forEach((row, index) => {
    rows.push(row)

    const shouldInsertMega =
      megaBoostListings.length > 0 &&
      (index + 1) % MEGA_BOOST_FREQUENCY === 0

    if (shouldInsertMega) {
      const sliceStart = megaIndex * 6
      const sliceEnd = sliceStart + 6
      const megaSlice = megaBoostListings.slice(sliceStart, sliceEnd)

      console.log("👑 Checking Mega Boost insertion at row:", index)
      console.log("👑 Mega slice length:", megaSlice.length)

      if (megaSlice.length > 0) {
        rows.push({
          type: "mega_boost",
          id: `mega-boost-${index}`,
          listings: megaSlice,
        })
        megaIndex++
      }
    }
  })

  // ✅ Insert Upgrade row at 5th row position (index 4)
  if (showUpgradeRow) {
    const insertAt = Math.min(4, rows.length)
    console.log("⭐ Inserting Upgrade Row at index:", insertAt)
    rows.splice(insertAt, 0, { type: "upgrade_row", id: "upgrade-row" })
  }

  console.log("📦 Final rows count:", rows.length)

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0F1E17"
        />
      }
      renderItem={({ item, index }) => {
        console.log("🧩 Rendering item index:", index, "type:", item.type)

        try {
          // 👑 FULL WIDTH MEGA BOOST BLOCK (2 ROW / 6 CARDS)
          if (item.type === "mega_boost") {
            console.log("👑 Rendering MegaBoostBlock with listings:", item.listings?.length)
            console.log("👑 MegaBoostBlock component type:", MegaBoostBlock)

            return (
              <View style={styles.fullRow}>
                <MegaBoostBlock listings={item.listings} />
              </View>
            )
          }

          // ✅ FULL WIDTH PRO ROW
          if (item.type === "upgrade_row") {
            console.log("⭐ Rendering UpgradeToProButton")
            console.log("⭐ UpgradeToProButton type:", UpgradeToProButton)

            return (
              <View style={styles.fullRow}>
                <UpgradeToProButton />
              </View>
            )
          }

          // ✅ NORMAL 3-COLUMN ROW
          console.log("🃏 Rendering standard row with cards:", item.listings?.length)
          console.log("🃏 ListingCard component type:", ListingCard)

          return (
            <View style={styles.row}>
              {item.listings.map((l, cardIndex) => {
                console.log("🃏 Rendering ListingCard:", l?.id, "at position:", cardIndex)

                return (
                  <View key={l.id} style={styles.cardWrap}>
                    <ListingCard
                      listing={l}
                      onPress={() => router.push(`/listing/${l.id}`)}
                    />
                  </View>
                )
              })}

              {/* ✅ Fill empty columns to keep spacing perfect */}
              {item.listings.length < NUM_COLUMNS
                ? Array.from({ length: NUM_COLUMNS - item.listings.length }).map(
                    (_, idx) => {
                      console.log("⬜ Rendering spacer:", idx)
                      return (
                        <View
                          key={`spacer-${item.id}-${idx}`}
                          style={styles.cardWrap}
                        />
                      )
                    }
                  )
                : null}
            </View>
          )
        } catch (err) {
          console.error("💥 RENDER CRASH SOURCE (ListingsGrid):", err)
          console.error("💥 Item that caused crash:", item)
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