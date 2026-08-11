import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, ProcessSaleItemInput } from "@/types/database"

export type SellProductsParams = {
  orderId: string
  items: ProcessSaleItemInput[]
  createdBy: string | null
}

export type SellProductsResult = { error: string | null }

/**
 * The reusable inventory deduction service. Call this whenever an order
 * is finalized (the future POS checkout flow) to atomically expand each
 * sold product's recipe and deduct the required ingredients. Backed by
 * the `process_sale` Postgres function, so the deduction either fully
 * applies or fully fails — never partial.
 */
export async function sellProducts(
  supabase: SupabaseClient<Database>,
  { orderId, items, createdBy }: SellProductsParams
): Promise<SellProductsResult> {
  if (items.length === 0) {
    return { error: null }
  }

  const { error } = await supabase.rpc("process_sale", {
    p_order_id: orderId,
    p_items: items,
    p_created_by: createdBy,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
