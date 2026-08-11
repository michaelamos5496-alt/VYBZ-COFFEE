import { ClipboardList, Plus } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

type RecipeWithDetails = {
  id: string
  product: { name: string; selling_price: number } | null
  recipe_items: {
    quantity: number
    inventory_item: { name: string; unit: string } | null
  }[]
}

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("recipes")
    .select(
      "id, product:products(name, selling_price), recipe_items(quantity, inventory_item:inventory_items(name, unit))"
    )
  const recipes = data as unknown as RecipeWithDetails[] | null

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Recipes" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Define which ingredients go into each product.
          </p>
          <Button size="sm">
            <Plus />
            New Recipe
          </Button>
        </div>

        {!recipes || recipes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No recipes yet"
            description="Create a recipe to link a product, like a Cappuccino, to the ingredients it consumes."
            actionLabel="Add Recipe"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id}>
                <CardHeader>
                  <CardTitle>{recipe.product?.name ?? "Untitled"}</CardTitle>
                  <CardDescription>
                    {recipe.recipe_items.length} ingredient
                    {recipe.recipe_items.length === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {recipe.recipe_items.map((ri, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{ri.inventory_item?.name}</span>
                      <span className="text-muted-foreground">
                        {ri.quantity} {ri.inventory_item?.unit}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
