"use server"

import { createClient } from "@/lib/supabase/server"
import { toFriendlyError } from "@/lib/errors"
import { getDateRange, type ReportPeriod } from "@/lib/reports/date-ranges"
import type { BarChartPoint } from "@/components/charts/bar-chart"

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour < 12 ? "am" : "pm"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}${period}`
})

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
})

export async function getSalesChartData(
  period: ReportPeriod
): Promise<{ error: string | null; data: BarChartPoint[] }> {
  const supabase = await createClient()

  if (period === "today") {
    const { data, error } = await supabase.rpc("sales_by_hour_today")
    if (error) return { error: toFriendlyError(error), data: [] }

    return {
      error: null,
      data: (data ?? []).map((row) => ({
        label: HOUR_LABELS[row.hour],
        value: Number(row.revenue),
        secondaryValue: Number(row.order_count),
      })),
    }
  }

  const days = period === "7days" ? 7 : 30
  const { data, error } = await supabase.rpc("sales_by_day", { p_days: days })
  if (error) return { error: error.message, data: [] }

  return {
    error: null,
    data: (data ?? []).map((row) => ({
      label: DAY_LABEL_FORMATTER.format(new Date(row.day)),
      value: Number(row.revenue),
      secondaryValue: Number(row.order_count),
    })),
  }
}

export async function getDashboardData() {
  const supabase = await createClient()
  const now = new Date()
  const today = getDateRange("today", now)
  const last7Days = getDateRange("7days", now)

  const [
    { data: statsRows, error: statsError },
    { data: paymentRows, error: paymentError },
    { data: topProductsRows, error: topProductsError },
    { data: lowStockRows, error: lowStockError },
  ] = await Promise.all([
    supabase.rpc("dashboard_stats", {
      p_start: today.start.toISOString(),
      p_end: today.end.toISOString(),
    }),
    supabase.rpc("payment_breakdown", {
      p_start: today.start.toISOString(),
      p_end: today.end.toISOString(),
    }),
    supabase.rpc("product_performance", {
      p_start: last7Days.start.toISOString(),
      p_end: last7Days.end.toISOString(),
      p_limit: 5,
      p_offset: 0,
    }),
    supabase
      .from("inventory_report")
      .select("*")
      .neq("stock_status", "normal")
      .eq("active", true)
      .order("current_quantity", { ascending: true }),
  ])

  return {
    stats: statsRows?.[0] ?? { total_sales: 0, order_count: 0, average_order_value: 0 },
    payments: paymentRows ?? [],
    topProducts: topProductsRows ?? [],
    lowStockItems: lowStockRows ?? [],
    errors: [statsError, paymentError, topProductsError, lowStockError]
      .filter((error) => error !== null)
      .map((error) => toFriendlyError(error)),
  }
}
