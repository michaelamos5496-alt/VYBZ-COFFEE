import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { getCurrentStaff } from "@/lib/auth/current-staff"
import { canViewReports } from "@/lib/auth/permissions"
import { getDateRange, type ReportPeriod } from "@/lib/reports/date-ranges"
import { ProductPerformanceView } from "./product-performance-view"

const PAGE_SIZE = 25

export default async function ProductPerformancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const staff = await getCurrentStaff()
  if (!canViewReports(staff?.role ?? null)) {
    redirect("/pos")
  }

  const params = await searchParams
  const get = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const period = (get("period") as ReportPeriod) || "30days"
  const page = Math.max(1, Number(get("page")) || 1)

  const supabase = await createClient()
  const range = getDateRange(period)

  const { data: rows, error } = await supabase.rpc("product_performance", {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  })

  const totalCount = rows?.[0]?.total_count ?? 0

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Product Performance" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <ProductPerformanceView
          rows={rows ?? []}
          totalCount={Number(totalCount)}
          pageSize={PAGE_SIZE}
          period={period}
          page={page}
          error={error?.message ?? null}
        />
      </div>
    </div>
  )
}
