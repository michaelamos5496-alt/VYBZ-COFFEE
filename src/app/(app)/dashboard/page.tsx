import {
  AlertTriangle,
  DollarSign,
  Receipt,
  TrendingUp,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const stats = [
  {
    label: "Today's Sales",
    value: "GH₵0.00",
    icon: DollarSign,
  },
  {
    label: "Today's Orders",
    value: "0",
    icon: Receipt,
  },
  {
    label: "Average Order Value",
    value: "GH₵0.00",
    icon: TrendingUp,
  },
  {
    label: "Low Stock",
    value: "0 items",
    icon: AlertTriangle,
  },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
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
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>Revenue over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex h-64 items-center justify-center rounded-lg border border-dashed text-sm">
                No sales data yet
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Breakdown of today&apos;s revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground flex h-64 items-center justify-center rounded-lg border border-dashed text-sm">
                No sales data yet
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best sellers this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex h-32 items-center justify-center rounded-lg border border-dashed text-sm">
              No product sales yet
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
