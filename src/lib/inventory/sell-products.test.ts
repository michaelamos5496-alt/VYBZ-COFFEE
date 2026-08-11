import { describe, expect, it, vi } from "vitest"

import { sellProducts } from "./sell-products"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

function mockSupabase(rpcResult: { error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  return { rpc } as unknown as SupabaseClient<Database>
}

describe("sellProducts", () => {
  it("calls the process_sale RPC with the order id, items, and staff id", async () => {
    const supabase = mockSupabase({ error: null })

    const result = await sellProducts(supabase, {
      orderId: "order-1",
      items: [{ product_id: "product-cappuccino", quantity: 2 }],
      createdBy: "staff-1",
    })

    expect(result.error).toBeNull()
    expect(supabase.rpc).toHaveBeenCalledWith("process_sale", {
      p_order_id: "order-1",
      p_items: [{ product_id: "product-cappuccino", quantity: 2 }],
      p_created_by: "staff-1",
    })
  })

  it("surfaces a clean error message when the database rejects the sale", async () => {
    const supabase = mockSupabase({
      error: { message: "Insufficient stock for Milk: need 600ml, have 400ml" },
    })

    const result = await sellProducts(supabase, {
      orderId: "order-2",
      items: [{ product_id: "product-cappuccino", quantity: 3 }],
      createdBy: null,
    })

    expect(result.error).toMatch(/insufficient stock/i)
  })

  it("skips the RPC call entirely for an empty order", async () => {
    const supabase = mockSupabase({ error: null })

    const result = await sellProducts(supabase, {
      orderId: "order-3",
      items: [],
      createdBy: "staff-1",
    })

    expect(result.error).toBeNull()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
