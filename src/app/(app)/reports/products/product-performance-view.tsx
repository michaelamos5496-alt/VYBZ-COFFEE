"use client"

import { useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Download, TrendingUp } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/layout/empty-state"
import { toCsv, downloadCsv } from "@/lib/reports/csv"
import { getDateRange, PERIOD_LABELS, type ReportPeriod } from "@/lib/reports/date-ranges"
import type { ProductPerformanceRow } from "@/types/database"
import { exportProductPerformance } from "./actions"

const PERIODS: ReportPeriod[] = ["today", "7days", "30days"]

export function ProductPerformanceView({
  rows,
  totalCount,
  pageSize,
  period,
  page,
  error,
}: {
  rows: ProductPerformanceRow[]
  totalCount: number
  pageSize: number
  period: ReportPeriod
  page: number
  error: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isExporting, startExport] = useTransition()

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function setPeriod(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(nextPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleExport() {
    startExport(async () => {
      const range = getDateRange(period)
      const result = await exportProductPerformance(
        range.start.toISOString(),
        range.end.toISOString()
      )

      if (result.error) {
        toast.error("Could not export report", { description: result.error })
        return
      }

      const csv = toCsv(result.rows, [
        { key: "product_name", label: "Product" },
        { key: "units_sold", label: "Units Sold", format: (v) => Number(v).toString() },
        { key: "revenue", label: "Revenue", format: (v) => Number(v).toFixed(2) },
        {
          key: "percentage_of_sales",
          label: "% of Sales",
          format: (v) => `${Number(v).toFixed(1)}%`,
        },
      ])

      downloadCsv(
        `product-performance-${new Date().toISOString().slice(0, 10)}.csv`,
        csv
      )
      toast.success(`Exported ${result.rows.length} products`)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            {PERIODS.map((option) => (
              <TabsTrigger key={option} value={option}>
                {PERIOD_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          disabled={isExporting || rows.length === 0}
          onClick={handleExport}
        >
          <Download />
          Export CSV
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No sales in this period"
          description="Product performance will appear here once orders come in."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Units Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>% of Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.product_id}>
                    <TableCell className="font-medium">{row.product_name}</TableCell>
                    <TableCell className="tabular-nums">{row.units_sold}</TableCell>
                    <TableCell className="tabular-nums">
                      GH₵{Number(row.revenue).toFixed(2)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {Number(row.percentage_of_sales).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Page {page} of {totalPages} — {totalCount} product
              {totalCount === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
