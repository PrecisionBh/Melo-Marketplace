import { useRouter } from "expo-router"
import { FlatList, StyleSheet } from "react-native"

import ListingCard, { Listing } from "./ListingCard"

type Props = {
  listings: Listing[]
}

export default function ListingsGrid({ listings }: Props) {
  const router = useRouter()

  return (
    <FlatList
      data={listings}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
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
  },
})
