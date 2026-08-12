"use client"

import { useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Download, Warehouse } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import type { InventoryReportRow, StockStatus } from "@/types/database"

const ALL = "all"

const STATUS_LABELS: Record<StockStatus, string> = {
  out_of_stock: "Out of Stock",
  low_stock: "Low Stock",
  normal: "Normal",
}

const STATUS_VARIANTS: Record<
  StockStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  out_of_stock: "destructive",
  low_stock: "outline",
  normal: "default",
}

export function InventoryReportView({
  items,
  status,
  error,
}: {
  items: InventoryReportRow[]
  status: StockStatus | null
  error: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isExporting, startExport] = useTransition()

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === ALL) params.delete("status")
    else params.set("status", value)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleExport() {
    startExport(async () => {
      const csv = toCsv(items, [
        { key: "name", label: "Item" },
        {
          key: "current_quantity",
          label: "Current Quantity",
          format: (v) => Number(v).toString(),
        },
        {
          key: "minimum_quantity",
          label: "Minimum Quantity",
          format: (v) => Number(v).toString(),
        },
        { key: "unit", label: "Unit" },
        {
          key: "cost_per_unit",
          label: "Cost per Unit",
          format: (v) => Number(v).toFixed(2),
        },
        {
          key: "stock_status",
          label: "Stock Status",
          format: (v) => STATUS_LABELS[v as StockStatus],
        },
      ])

      downloadCsv(`inventory-report-${new Date().toISOString().slice(0, 10)}.csv`, csv)
      toast.success(`Exported ${items.length} items`)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status ?? ALL} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value={ALL}>All</TabsTrigger>
            <TabsTrigger value="low_stock">Low Stock</TabsTrigger>
            <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
            <TabsTrigger value="normal">Normal</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          disabled={isExporting || items.length === 0}
          onClick={handleExport}
        >
          <Download />
          Export CSV
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="No inventory items"
          description="Nothing matches this filter."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Current Quantity</TableHead>
                <TableHead>Minimum Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost / Unit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {item.current_quantity}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {item.minimum_quantity}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="tabular-nums">
                    GH₵{Number(item.cost_per_unit).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[item.stock_status]}>
                      {STATUS_LABELS[item.stock_status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
