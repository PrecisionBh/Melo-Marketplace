import { StyleSheet, Text, TextInput, View } from "react-native"

type Props = {
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
}

export default function TitleDescriptionSection({
  title,
  setTitle,
  description,
  setDescription,
}: Props) {
  return (
    <View style={styles.fullBleedSection}>
      <View style={styles.inner}>
        {/* Section Header */}
        <Text style={styles.header}>Listing Details</Text>
        <Text style={styles.subText}>
          Add a clear title and description for your item.
        </Text>

        {/* Divider (same system as Photos) */}
        <View style={styles.divider} />

        {/* Title Field */}
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Precision Inlayed Series Cue 12.5mm"
            placeholderTextColor="#9BB7AA"
            style={styles.input}
            maxLength={80}
          />
        </View>

        {/* Description Field */}
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe condition, specs, shaft size, wrap, etc."
            placeholderTextColor="#9BB7AA"
            style={styles.textArea}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* 🔥 TRUE FULL-BLEED (NO EDGES) */
  fullBleedSection: {
    marginHorizontal: -16, // matches image section bleed
    backgroundColor: "#EEF6F2", // same soft section color
  },

  /* Internal spacing only (no outer card feel) */
  inner: {
    paddingTop: 18,
    paddingBottom: 20,
  },

  /* Header */
  header: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    paddingHorizontal: 16,
    marginBottom: 2,
  },

  subText: {
    fontSize: 12,
    color: "#323232",
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  /* Full-width underline divider */
  divider: {
    height: 1,
    backgroundColor: "#DCEAE4",
    width: "100%",
    marginBottom: 18,
  },

  /* Field spacing */
  fieldBlock: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E5F4F",
    marginBottom: 6,
  },

  /* Title input (single line) */
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E6DE",
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1F3D33",
    borderRadius: 0, // sharp, matches your no-rounded style
  },

  /* Description textarea */
  textArea: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E6DE",
    minHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 15,
    color: "#1F3D33",
    borderRadius: 0, // sharp edges per your design rule
  },
})