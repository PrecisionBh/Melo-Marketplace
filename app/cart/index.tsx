import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { Ionicons } from "@expo/vector-icons"
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

const MOCK_CART = [
  {
    id: "1",
    title: "Predator Revo Shaft",
    price: 425,
    image: "https://via.placeholder.com/100",
  },
  {
    id: "2",
    title: "Meucci Carbon Cue",
    price: 899,
    image: "https://via.placeholder.com/100",
  },
]

export default function CartScreen() {
  const total = MOCK_CART.reduce((sum, item) => sum + item.price, 0)

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Cart</Text>

        <View style={{ gap: 12 }}>
          {MOCK_CART.map((item) => (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.image} />

              <View style={styles.info}>
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {item.title}
                </Text>

                <Text style={styles.price}>
                  ${item.price.toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity>
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Total ({MOCK_CART.length} items)
            </Text>

            <Text style={styles.total}>
              ${total.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity style={styles.checkoutBtn}>
            <Text style={styles.checkoutText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GlobalFooter cartCount={MOCK_CART.length} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  content: {
    padding: 16,
    paddingBottom: 140,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 20,
    color: "#0F172A",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  image: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginRight: 14,
  },

  info: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  price: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
    color: "#0F172A",
  },

  summaryCard: {
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    alignItems: "center",
  },

  summaryLabel: {
    fontSize: 14,
    color: "#64748B",
  },

  total: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },

  checkoutBtn: {
    backgroundColor: "#0F1E17",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  checkoutText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
})