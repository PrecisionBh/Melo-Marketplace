import { useRouter } from "expo-router"
import { FlatList, StyleSheet } from "react-native"

import ListingCard, { Listing } from "./ListingCard"

type Props = {
  listings: Listing[]
}

export default function ListingsGrid({ listings }: Props) {
  const router = useRouter()

  const NUM_COLUMNS = 2

  return (
    <FlatList
      key={`grid-${NUM_COLUMNS}`} // 👈 FORCE REMOUNT WHEN COLUMNS CHANGE
      data={listings}
      keyExtractor={(item) => item.id}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      )}
    />
  )
}

const styles = StyleSheet.create({
  grid: {
    padding: 8,
  },
  row: {
    gap: 8,
    flex: 1,
  },
})
