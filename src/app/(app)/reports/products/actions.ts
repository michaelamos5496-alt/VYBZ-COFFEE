"use server"

import { createClient } from "@/lib/supabase/server"

const EXPORT_ROW_CAP = 5000

export async function exportProductPerformance(start: string, end: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("product_performance", {
    p_start: start,
    p_end: end,
    p_limit: EXPORT_ROW_CAP,
    p_offset: 0,
  })

  if (error) return { error: error.message, rows: [] }

  return { error: null, rows: data ?? [] }
}
