// app/lib/adminGate.tsx

import { ReactNode } from "react"
import { Text, View } from "react-native"
import { useAuth } from "../context/AuthContext"
import { isAdmin } from "./admin"

export function AdminGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user?.id

  if (!isAdmin(userId)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Access denied</Text>
      </View>
    )
  }

  return <>{children}</>
}
