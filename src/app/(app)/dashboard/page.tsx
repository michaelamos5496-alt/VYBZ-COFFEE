import { redirect } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ChevronRight, DollarSign, Receipt, TrendingUp } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentStaff } from "@/lib/auth/current-staff"
import { canViewReports } from "@/lib/auth/permissions"
import { getDashboardData, getSalesChartData } from "./actions"
import { SalesChart } from "./sales-chart"

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
}

export default async function DashboardPage() {
  const staff = await getCurrentStaff()
  if (!canViewReports(staff?.role ?? null)) {
    redirect("/pos")
  }

  const [dashboard, chart] = await Promise.all([
    getDashboardData(),
    getSalesChartData("7days"),
  ])

  const { stats, payments, topProducts, lowStockItems } = dashboard

  const summaryCards = [
    {
      label: "Today's Sales",
      value: `GH₵${Number(stats.total_sales).toFixed(2)}`,
      icon: DollarSign,
    },
    {
      label: "Today's Orders",
      value: String(stats.order_count),
      icon: Receipt,
    },
    {
      label: "Average Order Value",
      value: `GH₵${Number(stats.average_order_value).toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      label: "Low Stock",
      value: `${lowStockItems.length} item${lowStockItems.length === 1 ? "" : "s"}`,
      icon: AlertTriangle,
      href: "/reports/inventory",
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((stat) => {
            const card = (
              <Card
                className={
                  stat.href
                    ? "transition-colors hover:border-primary/50 hover:bg-muted/40"
                    : undefined
                }
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <stat.icon className="text-muted-foreground size-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight">
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            )
            return stat.href ? (
              <Link key={stat.label} href={stat.href}>
                {card}
              </Link>
            ) : (
              <div key={stat.label}>{card}</div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>Revenue and orders over time</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesChart initialData={chart.data} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Breakdown</CardTitle>
              <CardDescription>Today, by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-muted-foreground flex h-32 items-center justify-center rounded-lg border border-dashed text-sm">
                  No payments today yet
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {payments.map((row) => (
                    <li
                      key={row.payment_method}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {PAYMENT_LABELS[row.payment_method] ?? row.payment_method}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {row.transaction_count} transaction
                          {row.transaction_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        GH₵{Number(row.total_value).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Best sellers over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-muted-foreground flex h-32 items-center justify-center rounded-lg border border-dashed text-sm">
                  No product sales yet
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {topProducts.map((row) => (
                    <li
                      key={row.product_id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{row.product_name}</p>
                        <p className="text-muted-foreground text-xs">
                          {row.units_sold} sold
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        GH₵{Number(row.revenue).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock</CardTitle>
              <CardDescription>Ingredients at or below minimum</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-muted-foreground flex h-32 items-center justify-center rounded-lg border border-dashed text-sm">
                  Everything is well stocked
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {lowStockItems.slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/reports/inventory?status=${item.stock_status}`}
                        className="hover:bg-muted/60 -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <p className="text-sm font-medium">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {item.current_quantity} / {item.minimum_quantity} {item.unit}
                          </span>
                          <Badge
                            variant={
                              item.stock_status === "out_of_stock"
                                ? "destructive"
                                : item.stock_status === "low_stock"
                                  ? "outline"
                                  : "default"
                            }
                          >
                            {item.stock_status === "out_of_stock"
                              ? "Out of Stock"
                              : item.stock_status === "low_stock"
                                ? "Low Stock"
                                : "Normal"}
                          </Badge>
                          <ChevronRight className="text-muted-foreground size-4" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
