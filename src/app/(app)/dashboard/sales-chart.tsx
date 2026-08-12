"use client"

import { useEffect, useState, useTransition } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, type BarChartPoint } from "@/components/charts/bar-chart"
import { PERIOD_LABELS, type ReportPeriod } from "@/lib/reports/date-ranges"
import { getSalesChartData } from "./actions"

const PERIODS: ReportPeriod[] = ["today", "7days", "30days"]

export function SalesChart({ initialData }: { initialData: BarChartPoint[] }) {
  const [period, setPeriod] = useState<ReportPeriod>("7days")
  const [data, setData] = useState<BarChartPoint[]>(initialData)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getSalesChartData(period)
      setData(result.data)
    })
  }, [period])

  const totalRevenue = data.reduce((sum, point) => sum + point.value, 0)
  const totalOrders = data.reduce((sum, point) => sum + (point.secondaryValue ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            GH₵{totalRevenue.toFixed(2)}
          </p>
          <p className="text-muted-foreground text-sm">
            {totalOrders} order{totalOrders === 1 ? "" : "s"}
          </p>
        </div>
        <Tabs value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
          <TabsList>
            {PERIODS.map((option) => (
              <TabsTrigger key={option} value={option}>
                {PERIOD_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <BarChart
          data={data}
          valueFormatter={(v) => `GH₵${v.toFixed(2)}`}
          secondaryLabel="orders"
          emptyMessage="No sales in this period yet"
        />
      )}
    </div>
  )
}
