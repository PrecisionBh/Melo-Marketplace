import { Alert } from "react-native"

export function showSuccess(message: string) {
  Alert.alert("Success", message)
}

export function showError(message: string) {
  Alert.alert("Error", message)
}

export function showInfo(message: string) {
  Alert.alert("Notice", message)
}
