import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, ProcessSaleItemInput } from "@/types/database"

export type SellProductsParams = {
  orderId: string
  items: ProcessSaleItemInput[]
}

export type SellProductsResult = { error: string | null }

/**
 * Thin wrapper around the `process_sale` Postgres function. Superseded
 * in practice by `checkout_order` (Phase 4), which calls process_sale
 * itself as part of one atomic checkout — kept for any future caller
 * that needs to deduct inventory for an already-created order outside
 * that flow. process_sale is SECURITY DEFINER and reads the acting user
 * from the session itself, so there's no createdBy to pass here.
 */
export async function sellProducts(
  supabase: SupabaseClient<Database>,
  { orderId, items }: SellProductsParams
): Promise<SellProductsResult> {
  if (items.length === 0) {
    return { error: null }
  }

  const { error } = await supabase.rpc("process_sale", {
    p_order_id: orderId,
    p_items: items,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
