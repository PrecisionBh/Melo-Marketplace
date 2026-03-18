import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"

export default function ShippingScreen() {
  const router = useRouter()
  const { orderId } = useLocalSearchParams()

  const [loading, setLoading] = useState(false)
  const [rates, setRates] = useState<any[]>([])
  const [order, setOrder] = useState<any>(null)

  const [selectedRate, setSelectedRate] = useState<any>(null) // ✅ NEW

  const [weight, setWeight] = useState("")
  const [length, setLength] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")

  useEffect(() => {
    if (orderId) fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (!error) setOrder(data)
  }

  const getRates = async () => {
    try {
      setLoading(true)
      setSelectedRate(null) // reset selection

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-shippo-rates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            fromAddress: {
              name: "Melo",
              street1: "123 Main St",
              city: "Orlando",
              state: "FL",
              zip: "32801",
              country: "US",
            },
            toAddress: {
              name: order?.shipping_name || "Buyer",
              street1: order?.shipping_line1,
              city: order?.shipping_city,
              state: order?.shipping_state,
              zip: order?.shipping_postal_code,
              country: order?.shipping_country || "US",
            },
            parcel: {
              length,
              width,
              height,
              distance_unit: "in",
              weight,
              mass_unit: "lb",
            },
          }),
        }
      )

      const data = await res.json()
      setRates(data)
    } catch (err) {
      console.log("RATE ERROR", err)
    } finally {
      setLoading(false)
    }
  }

  // ✅ PURCHASE LABEL
  const purchaseLabel = async () => {
    try {
      if (!selectedRate) return

      setLoading(true)

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-label-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            orderId,
            rate: selectedRate,
          }),
        }
      )

      const data = await res.json()

      if (data?.url) {
        router.push(data.url)
      }
    } catch (err) {
      console.log("CHECKOUT ERROR", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Create Label" backRoute="/seller-hub/orders" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Shipping Label</Text>

        {/* 🧾 BUYER ADDRESS */}
        {order && (
          <View style={styles.addressCard}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <Text>{order.shipping_name}</Text>
            <Text>{order.shipping_line1}</Text>
            {order.shipping_line2 && <Text>{order.shipping_line2}</Text>}
            <Text>
              {order.shipping_city}, {order.shipping_state}{" "}
              {order.shipping_postal_code}
            </Text>
          </View>
        )}

        {/* 📦 PACKAGE DETAILS */}
        <Text style={styles.sectionTitle}>Package Details</Text>

        <Text style={styles.label}>Weight (lbs)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter weight"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Package Dimensions (inches)</Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Length (L)"
            value={length}
            onChangeText={setLength}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Width (W)"
            value={width}
            onChangeText={setWidth}
            keyboardType="numeric"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Height (H)"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
        />

        <Text style={styles.helperText}>
          L × W × H (Length × Width × Height)
        </Text>

        <TouchableOpacity style={styles.button} onPress={getRates}>
          <Text style={styles.buttonText}>Get Shipping Rates</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

        {/* 💰 RATES */}
        {rates.map((rate, index) => {
          const isSelected =
            selectedRate?.object_id === rate.object_id

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.rateCard,
                isSelected && { borderColor: "#7FAF9B", borderWidth: 2 },
              ]}
              onPress={() => setSelectedRate(rate)}
            >
              <Text style={styles.rateText}>
                {rate.provider} - {rate.servicelevel?.name}
              </Text>
              <Text style={styles.price}>${rate.amount}</Text>

              {/* ✅ PURCHASE BUTTON (only on selected) */}
              {isSelected && (
                <TouchableOpacity
                  style={[styles.button, { marginTop: 10 }]}
                  onPress={purchaseLabel}
                >
                  <Text style={styles.buttonText}>Purchase Label</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  container: {
    padding: 20,
    paddingBottom: 100,
  },

  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    color: "#1E1E1E",
  },

  helperText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },

  addressCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
  },

  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  half: {
    flex: 1,
  },

  button: {
    backgroundColor: "#7FAF9B",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  rateCard: {
    marginTop: 15,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  rateText: {
    fontSize: 14,
  },

  price: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 5,
  },
})