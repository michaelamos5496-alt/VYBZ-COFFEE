import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { ProductsView } from "./products-view"

export default async function ProductsPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase.from("categories").select("*").order("sort_order"),
  ])

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Products" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <ProductsView
          products={products ?? []}
          categories={categories ?? []}
        />
      </div>
    </div>
  )
}
