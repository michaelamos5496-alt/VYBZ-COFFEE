import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { getCurrentStaff } from "@/lib/auth/current-staff"
import { canViewReports } from "@/lib/auth/permissions"
import type { StockStatus } from "@/types/database"
import { InventoryReportView } from "./inventory-report-view"

export default async function InventoryReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const staff = await getCurrentStaff()
  if (!canViewReports(staff?.role ?? null)) {
    redirect("/pos")
  }

  const params = await searchParams
  const statusParam = params.status
  const status = (Array.isArray(statusParam) ? statusParam[0] : statusParam) as
    | StockStatus
    | undefined

  const supabase = await createClient()

  let query = supabase.from("inventory_report").select("*").order("name")
  if (status) {
    query = query.eq("stock_status", status)
  }

  const { data: items, error } = await query

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Inventory Report" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <InventoryReportView
          items={items ?? []}
          status={status ?? null}
          error={error?.message ?? null}
        />
      </div>
    </div>
  )
}
