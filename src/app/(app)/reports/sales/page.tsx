import { LineChart } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/layout/empty-state"

export default function SalesReportPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Sales Report" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EmptyState
          icon={LineChart}
          title="No sales yet"
          description="Once you start making sales through the POS, revenue and order trends will appear here."
        />
      </div>
    </div>
  )
}
