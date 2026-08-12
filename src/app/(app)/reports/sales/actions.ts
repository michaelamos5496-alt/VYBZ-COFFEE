"use server"

import { createClient } from "@/lib/supabase/server"
import { toFriendlyError } from "@/lib/errors"
import type { SalesReportFilters } from "./types"

// A report export should cover everything matching the filter, not just
// the current page — but "everything" is still bounded so a wide-open
// filter can't pull the whole sales history into memory in one request.
const EXPORT_ROW_CAP = 5000

export async function exportSalesReport(
  filters: SalesReportFilters,
  start: string,
  end: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("search_orders", {
    p_start: start,
    p_end: end,
    p_cashier_id: filters.cashierId,
    p_payment_method: filters.paymentMethod,
    p_product_id: filters.productId,
    p_category_id: filters.categoryId,
    p_limit: EXPORT_ROW_CAP,
    p_offset: 0,
  })

  if (error) return { error: toFriendlyError(error), rows: [] }

  return { error: null, rows: data ?? [] }
}
