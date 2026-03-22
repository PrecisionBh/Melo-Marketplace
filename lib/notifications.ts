import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

/**
 * 🔔 Notification behavior while app is foregrounded
 */
const notificationHandler: Notifications.NotificationHandler = {
  handleNotification: async () => {
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    } as Notifications.NotificationBehavior
  },
}

Notifications.setNotificationHandler(notificationHandler)

/**
 * 📲 Setup notification environment (NO token logic here)
 */
export async function setupNotifications() {
  // Android channel (required)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    })
  }
}