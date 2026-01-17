// app/lib/admin.ts

export const ADMIN_USER_IDS = [
  "PUT_YOUR_SUPABASE_USER_ID_HERE",
]

export function isAdmin(userId?: string | null) {
  if (!userId) return false
  return ADMIN_USER_IDS.includes(userId)
}
