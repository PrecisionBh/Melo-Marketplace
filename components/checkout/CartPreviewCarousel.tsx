import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

type CartItem = {
  id: string
  title: string
  image_url: string | null
  price: number
  quantity: number
  size?: string | null // 👈 ADD THIS
}

export default function CartPreviewCarousel({
  items,
}: {
  items: CartItem[]
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>
        Review Items
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {items.map((item) => (
          <View
            key={item.id}
            style={styles.card}
          >
            {item.image_url ? (
              <Image
                source={{
                  uri: item.image_url,
                }}
                style={styles.image}
              />
            ) : (
              <View
                style={
                  styles.placeholder
                }
              />
            )}

            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* 🔥 UPDATED META BLOCK */}
            <View style={styles.metaWrap}>
              {item.size && (
                <Text style={styles.meta}>
                  Size: {item.size}
                </Text>
              )}

              <Text style={styles.meta}>
                Qty: {item.quantity}
              </Text>
            </View>

            <Text style={styles.price}>
              $
              {Number(
                item.price
              ).toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },

  header: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },

  scrollContent: {
    paddingRight: 8,
  },

  card: {
    width: 150,
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 12,
    marginRight: 12,
  },

  image: {
    width: "100%",
    height: 110,
    borderRadius: 14,
    marginBottom: 10,
  },

  placeholder: {
    width: "100%",
    height: 110,
    borderRadius: 14,
    backgroundColor: "#EEE",
    marginBottom: 10,
  },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    minHeight: 34,
  },

  metaWrap: {
    marginTop: 6,
  },

  meta: {
    fontSize: 12,
    color: "#6B7280",
  },

  price: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "800",
    color: "#D97732",
  },
})