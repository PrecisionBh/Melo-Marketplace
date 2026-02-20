import { Tabs } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"

export default function TabsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="home"
          options={{ title: "Home" }}
        />
      </Tabs>
    </GestureHandlerRootView>
  )
}
