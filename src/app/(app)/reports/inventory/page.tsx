import { Warehouse } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/layout/empty-state"

export default function InventoryReportPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Inventory Report" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EmptyState
          icon={Warehouse}
          title="No inventory movement yet"
          description="Stock usage, waste, and restocking history will appear here once you start tracking inventory."
        />
      </div>
    </div>
  )
}
