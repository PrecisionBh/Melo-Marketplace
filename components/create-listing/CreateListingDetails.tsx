import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

type Props = {
  title: string
  setTitle: (val: string) => void
  price: string
  setPrice: (val: string) => void
  quantity: string
  setQuantity: (val: string) => void
  description: string
  setDescription: (val: string) => void
}

export default function CreateListingDetails({
  title,
  setTitle,
  price,
  setPrice,
  quantity,
  setQuantity,
  description,
  setDescription,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What are you selling?"
          placeholderTextColor="#1b1b1b"
          style={styles.input}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.leftHalf}>
          <Text style={styles.label}>Price</Text>
          <TextInput
  value={price}
  onChangeText={(val) =>
    setPrice(val.replace(/[^0-9.]/g, ""))
  }
  onBlur={() => {
    if (!price) return

    const num = parseFloat(price)

    if (!isNaN(num)) {
      setPrice(num.toFixed(2))
    }
  }}
  placeholder="0.00"
  placeholderTextColor="#1b1b1b"
  style={styles.input}
  keyboardType="decimal-pad"
/>
        </View>

        <View style={styles.rightHalf}>
          <Text style={styles.label}>Quantity Available</Text>
          <TextInput
            value={quantity}
            onChangeText={(val) =>
              setQuantity(val.replace(/[^0-9]/g, ""))
            }
            placeholder="1"
            placeholderTextColor="#1b1b1b"
            style={styles.input}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your item..."
          placeholderTextColor="#1b1b1b"
          style={styles.textArea}
          multiline
          textAlignVertical="top"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
  },

  fieldBlock: {
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    marginBottom: 16,
  },

  leftHalf: {
    flex: 1,
    marginRight: 6,
  },

  rightHalf: {
    flex: 1,
    marginLeft: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111",
  },

  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    minHeight: 120,
    fontSize: 15,
    color: "#111",
  },
})