import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

/**
 * 🔔 Notification behavior while app is foregrounded
 * Expo will infer the types correctly here
 */
const notificationHandler: Notifications.NotificationHandler = {
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    } as Notifications.NotificationBehavior
  },
}

Notifications.setNotificationHandler(notificationHandler)
/**
 * 📲 Register for Expo push notifications
 * Returns Expo push token (NO Firebase)
 */
export async function registerForPushNotifications() {
  // Must be a real device
  if (!Device.isDevice) {
    console.warn("Must use physical device for push notifications")
    return null
  }

  // Android notification channel (required)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  // Check existing permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync()

  let finalStatus = existingStatus

  // Request permission if not granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== "granted") {
    console.warn("Notification permission not granted")
    return null
  }

  // Get Expo project ID (required for EAS)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId

  if (!projectId) {
    console.warn("Expo projectId not found")
    return null
  }

  // Get Expo Push Token (NO Firebase)
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data

  return token
}
