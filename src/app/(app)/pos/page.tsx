import { ShoppingCart } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/layout/empty-state"

export default function PosPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="New Sale" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EmptyState
          icon={ShoppingCart}
          title="POS is coming soon"
          description="The checkout screen will let cashiers ring up orders and take payment. It's being built in the next phase."
        />
      </div>
    </div>
  )
}
