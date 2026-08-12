"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Download, LineChart } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/layout/empty-state"
import { getDateRange } from "@/lib/reports/date-ranges"
import { toCsv, downloadCsv } from "@/lib/reports/csv"
import type { OrderSearchRow, PaymentMethod } from "@/types/database"
import { exportSalesReport } from "./actions"
import type { SalesReportFilters } from "./types"

const ALL = "all"

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
}

export function SalesReportView({
  orders,
  totalCount,
  pageSize,
  filters,
  staff,
  categories,
  products,
  error,
  showCashierFilter = true,
}: {
  orders: OrderSearchRow[]
  totalCount: number
  pageSize: number
  filters: SalesReportFilters
  staff: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  products: { id: string; name: string }[]
  error: string | null
  showCashierFilter?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isExporting, startExport] = useTransition()
  const [from, setFrom] = useState(filters.from ?? "")
  const [to, setTo] = useState(filters.to ?? "")

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (resetPage) params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleExport() {
    startExport(async () => {
      const defaultRange = getDateRange("30days")
      const start = filters.from ? new Date(filters.from) : defaultRange.start
      const end = filters.to
        ? new Date(`${filters.to}T23:59:59.999Z`)
        : defaultRange.end

      const result = await exportSalesReport(
        filters,
        start.toISOString(),
        end.toISOString()
      )

      if (result.error) {
        toast.error("Could not export report", { description: result.error })
        return
      }

      const csv = toCsv(result.rows, [
        { key: "order_number", label: "Order #" },
        {
          key: "completed_at",
          label: "Date",
          format: (v) => (v ? new Date(v as string).toLocaleString() : ""),
        },
        { key: "cashier_name", label: "Cashier" },
        { key: "total", label: "Total", format: (v) => Number(v).toFixed(2) },
        {
          key: "payment_method",
          label: "Payment Method",
          format: (v) => (v ? PAYMENT_LABELS[v as PaymentMethod] : ""),
        },
        { key: "status", label: "Status" },
      ])

      downloadCsv(`sales-report-${new Date().toISOString().slice(0, 10)}.csv`, csv)
      toast.success(`Exported ${result.rows.length} orders`)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from-date">From</Label>
          <Input
            id="from-date"
            type="date"
            value={from}
            className="w-40"
            onChange={(e) => setFrom(e.target.value)}
            onBlur={() => updateParams({ from })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to-date">To</Label>
          <Input
            id="to-date"
            type="date"
            value={to}
            className="w-40"
            onChange={(e) => setTo(e.target.value)}
            onBlur={() => updateParams({ to })}
          />
        </div>

        {showCashierFilter && (
          <div className="flex flex-col gap-1.5">
            <Label>Cashier</Label>
            <Select
              value={filters.cashierId ?? ALL}
              onValueChange={(value) =>
                updateParams({ cashier: value === ALL ? null : value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All cashiers</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Payment Method</Label>
          <Select
            value={filters.paymentMethod ?? ALL}
            onValueChange={(value) =>
              updateParams({ payment: value === ALL ? null : value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All methods</SelectItem>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Category</Label>
          <Select
            value={filters.categoryId ?? ALL}
            onValueChange={(value) =>
              updateParams({ category: value === ALL ? null : value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Product</Label>
          <Select
            value={filters.productId ?? ALL}
            onValueChange={(value) =>
              updateParams({ product: value === ALL ? null : value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="ml-auto"
          disabled={isExporting || orders.length === 0}
          onClick={handleExport}
        >
          <Download />
          Export CSV
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No sales found"
          description="Try widening your date range or clearing filters."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.order_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.completed_at
                        ? new Date(order.completed_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>{order.cashier_name ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      GH₵{Number(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {order.payment_method
                        ? PAYMENT_LABELS[order.payment_method]
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="capitalize">
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Page {filters.page} of {totalPages} — {totalCount} order
              {totalCount === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => goToPage(filters.page - 1)}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => goToPage(filters.page + 1)}
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
