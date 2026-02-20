import { useRouter } from "expo-router"
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native"

import ListingCard, { Listing } from "./ListingCard"

/* ---------------- TYPES ---------------- */

type Props = {
  listings: Listing[]
  refreshing: boolean
  onRefresh: () => void
}

/* ---------------- COMPONENT ---------------- */

export default function ListingsGrid({
  listings,
  refreshing,
  onRefresh,
}: Props) {
  const router = useRouter()
  const NUM_COLUMNS = 3 // 🔥 CHANGED FROM 2 → 3 (higher density)

  return (
    <FlatList
      key={`grid-${NUM_COLUMNS}`} // forces proper re-render when columns change
      data={listings}
      keyExtractor={(item) => item.id}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0F1E17"
        />
      }
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <ListingCard
            listing={item}
            onPress={() => router.push(`/listing/${item.id}`)}
          />
        </View>
      )}
    />
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 3, // 🔥 FRACTIONAL SIDE PADDING (clean edge spacing)
    paddingTop: 4,
    paddingBottom: 140,
  },
  row: {
    gap: 4, // 🔥 micro gap between columns (not bulky)
    flex: 1,
  },
  cardWrap: {
    flex: 1,
  },
})
