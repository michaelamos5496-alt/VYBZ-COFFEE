import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { getCurrentStaff } from "@/lib/auth/current-staff"
import { canViewReports } from "@/lib/auth/permissions"
import { getDateRange } from "@/lib/reports/date-ranges"
import { SalesReportView } from "./sales-report-view"
import type { SalesReportFilters } from "./types"

const PAGE_SIZE = 25

function parseFilters(
  params: Record<string, string | string[] | undefined>
): SalesReportFilters {
  const get = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  return {
    from: get("from") || null,
    to: get("to") || null,
    cashierId: get("cashier") || null,
    paymentMethod: (get("payment") as SalesReportFilters["paymentMethod"]) || null,
    productId: get("product") || null,
    categoryId: get("category") || null,
    page: Math.max(1, Number(get("page")) || 1),
  }
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = parseFilters(params)
  const supabase = await createClient()
  const staffMember = await getCurrentStaff()
  const isFullReport = canViewReports(staffMember?.role ?? null)

  const defaultRange = getDateRange("30days")
  const start = filters.from ? new Date(filters.from) : defaultRange.start
  const end = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : defaultRange.end

  const [{ data: orders, error }, { data: staff }, { data: categories }, { data: products }] =
    await Promise.all([
      supabase.rpc("search_orders", {
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_cashier_id: filters.cashierId,
        p_payment_method: filters.paymentMethod,
        p_product_id: filters.productId,
        p_category_id: filters.categoryId,
        p_limit: PAGE_SIZE,
        p_offset: (filters.page - 1) * PAGE_SIZE,
      }),
      isFullReport
        ? supabase.from("staff").select("id, name").order("name")
        : Promise.resolve({ data: [] }),
      supabase.from("categories").select("id, name").order("sort_order"),
      supabase.from("products").select("id, name").order("name"),
    ])

  const totalCount = orders?.[0]?.total_count ?? 0

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={isFullReport ? "Sales Report" : "My Sales"} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <SalesReportView
          orders={orders ?? []}
          totalCount={Number(totalCount)}
          pageSize={PAGE_SIZE}
          filters={filters}
          staff={staff ?? []}
          categories={categories ?? []}
          products={products ?? []}
          error={error?.message ?? null}
          showCashierFilter={isFullReport}
        />
      </div>
    </div>
  )
}
