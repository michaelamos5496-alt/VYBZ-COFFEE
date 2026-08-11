import type { InventoryUnit } from "@/types/database"

export type RecipeItemWithDetails = {
  id: string
  inventory_item_id: string
  quantity: number
  unit: InventoryUnit
}

export type RecipeWithItems = {
  id: string
  product_id: string
  recipe_items: RecipeItemWithDetails[]
}
