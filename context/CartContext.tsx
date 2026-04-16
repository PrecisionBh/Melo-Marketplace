import { createContext, useContext, useEffect, useState } from "react"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type CartContextType = {
  cartCount: number
  refreshCartCount: () => Promise<void>
  setCartCount: React.Dispatch<
    React.SetStateAction<number>
  >
}

const CartContext =
  createContext<CartContextType | null>(
    null
  )

export function CartProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { session } = useAuth()

  const [cartCount, setCartCount] =
    useState(0)

  const refreshCartCount =
    async () => {
      if (!session?.user?.id) {
        setCartCount(0)
        return
      }

      const { count } = await supabase
        .from("cart_items")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", session.user.id)

      setCartCount(count ?? 0)
    }

  useEffect(() => {
  if (!session?.user?.id) {
    setCartCount(0)
    return
  }

  const timeout = setTimeout(() => {
    refreshCartCount()
  }, 100)

  return () => clearTimeout(timeout)
}, [session])

  return (
    <CartContext.Provider
      value={{
        cartCount,
        refreshCartCount,
        setCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)

  if (!ctx) {
    throw new Error(
      "useCart must be used within CartProvider"
    )
  }

  return ctx
}