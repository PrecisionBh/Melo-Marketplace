import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function OwnerListingActions({
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  isActive = true,
}: {
  onEdit: () => void
  onDuplicate: () => void
  onToggleActive: () => void
  onDelete: () => void
  isActive?: boolean
}) {
  const [expanded, setExpanded] =
    useState(false)

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.editBtn}
        onPress={onEdit}
      >
        <Ionicons
          name="create-outline"
          size={18}
          color="#111827"
        />

        <Text style={styles.editText}>
          Edit Listing
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.moreBtn}
        onPress={() =>
          setExpanded(!expanded)
        }
      >
        <Text style={styles.moreText}>
          More actions
        </Text>

        <Ionicons
          name={
            expanded
              ? "chevron-up"
              : "chevron-down"
          }
          size={16}
          color="#6B7280"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdown}>
          <ActionRow
            icon="eye-off-outline"
            title={
              isActive
                ? "Deactivate Listing"
                : "Activate Listing"
            }
            subtitle={
              isActive
                ? "Hide from marketplace without deleting"
                : "Make listing visible again"
            }
            onPress={onToggleActive}
          />

          <ActionRow
            icon="copy-outline"
            title="Duplicate Listing"
            subtitle="Create an identical copy ready to edit"
            onPress={onDuplicate}
          />

          <ActionRow
            icon="trash-outline"
            title="Delete Listing"
            subtitle="Permanently remove this listing"
            destructive
            onPress={onDelete}
            noBorder
          />
        </View>
      )}
    </View>
  )
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
  noBorder,
}: {
  icon: any
  title: string
  subtitle: string
  onPress: () => void
  destructive?: boolean
  noBorder?: boolean
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionRow,
        noBorder && {
          borderBottomWidth: 0,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          destructive
            ? "#EF4444"
            : "#6B7280"
        }
      />

      <View style={styles.actionContent}>
        <Text
          style={[
            styles.actionTitle,
            destructive &&
              styles.destructiveText,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.actionSub}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    paddingHorizontal: 16,
  },

  editBtn: {
    height: 64,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  editText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  moreBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  moreText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },

  dropdown: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 14,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  actionSub: {
    fontSize: 13,
    color: "#6B7280",
  },

  destructiveText: {
    color: "#EF4444",
  },
})