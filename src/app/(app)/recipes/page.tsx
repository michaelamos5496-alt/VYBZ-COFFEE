import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { RecipesView } from "./recipes-view"
import type { RecipeWithItems } from "./types"

export default async function RecipesPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: inventoryItems }, { data: recipesData }] =
    await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("inventory_items").select("*").order("name"),
      supabase
        .from("recipes")
        .select("id, product_id, recipe_items(id, inventory_item_id, quantity, unit)"),
    ])

  const recipes = recipesData as unknown as RecipeWithItems[] | null

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Recipes" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <RecipesView
          products={products ?? []}
          inventoryItems={inventoryItems ?? []}
          recipes={recipes ?? []}
        />
      </div>
    </div>
  )
}
