"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type {
  CheckoutResult,
  PaymentMethod,
  ProcessSaleItemInput,
} from "@/types/database"

export async function holdOrder(items: ProcessSaleItemInput[]) {
  const supabase = await createClient()

  const { error } = await supabase.rpc("hold_order", {
    p_items: items,
  })

  if (error) return { error: error.message }

  revalidatePath("/pos")
  return { error: null }
}

export async function deleteHeldOrder(orderId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("status", "held")

  if (error) return { error: error.message }

  revalidatePath("/pos")
  return { error: null }
}

export type CheckoutInput = {
  items: ProcessSaleItemInput[]
  discount: number
  paymentMethod: PaymentMethod
  amountReceived: number | null
}

export async function checkoutOrder(input: CheckoutInput) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("checkout_order", {
    p_items: input.items,
    p_discount: input.discount,
    p_payment_method: input.paymentMethod,
    p_amount_received: input.amountReceived,
  })

  if (error) return { error: error.message, result: null }

  const result = (data as CheckoutResult[] | null)?.[0] ?? null
  if (!result) return { error: "Checkout did not return an order", result: null }

  revalidatePath("/pos")
  revalidatePath("/inventory")
  return { error: null, result }
}
