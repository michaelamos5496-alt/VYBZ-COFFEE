import { createClient } from "@/lib/supabase/server"
import { PosView } from "./pos-view"
import type { HeldOrderSummary } from "./types"

export default async function PosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: categories },
    { data: products },
    { data: settings },
    { data: heldOrdersData },
    { data: staff },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("products").select("*").eq("active", true).order("name"),
    supabase.from("business_settings").select("*").limit(1).single(),
    supabase
      .from("orders")
      .select(
        "id, subtotal, total, created_at, order_items(id, product_id, product_name, quantity, unit_price)"
      )
      .eq("status", "held")
      .order("created_at", { ascending: false }),
    user
      ? supabase.from("staff").select("name").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const heldOrders = heldOrdersData as unknown as HeldOrderSummary[] | null

  return (
    <PosView
      categories={categories ?? []}
      products={products ?? []}
      settings={settings ?? null}
      heldOrders={heldOrders ?? []}
      cashierName={staff?.name ?? user?.email ?? "Cashier"}
    />
  )
}
