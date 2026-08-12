import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { getCurrentStaff } from "@/lib/auth/current-staff"
import { canViewStockMovementHistory } from "@/lib/auth/permissions"
import { InventoryView } from "./inventory-view"
import type { MovementWithDetails } from "./movement-history"

export default async function InventoryPage() {
  const supabase = await createClient()
  const staff = await getCurrentStaff()
  const canViewHistory = canViewStockMovementHistory(staff?.role ?? null)

  const [{ data: items }, { data: movementsData }] = await Promise.all([
    supabase.from("inventory_items").select("*").order("name"),
    canViewHistory
      ? supabase
          .from("stock_movements")
          .select(
            "id, movement_type, quantity, previous_quantity, new_quantity, note, created_at, inventory_item:inventory_items(name, unit), staff(name)"
          )
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
  ])

  const movements = movementsData as unknown as MovementWithDetails[] | null

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Inventory" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <InventoryView items={items ?? []} movements={movements ?? []} />
      </div>
    </div>
  )
}
