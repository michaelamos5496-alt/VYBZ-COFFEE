"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { toFriendlyError } from "@/lib/errors"
import {
  validateRecipeItems,
  type RecipeItemDraft,
} from "@/lib/inventory/recipe-validation"
import type { InventoryUnit } from "@/types/database"

export async function saveRecipe(productId: string, items: RecipeItemDraft[]) {
  const supabase = await createClient()

  const { data: inventoryItems, error: inventoryError } = await supabase
    .from("inventory_items")
    .select("id, unit")
    .in(
      "id",
      items.map((item) => item.inventoryItemId)
    )

  if (inventoryError) return { error: toFriendlyError(inventoryError) }

  const inventoryLookup = Object.fromEntries(
    (inventoryItems ?? []).map((item) => [item.id, { unit: item.unit }])
  ) as Record<string, { unit: InventoryUnit }>

  const validation = validateRecipeItems(items, inventoryLookup)
  if (!validation.ok) return { error: validation.error }

  const { error } = await supabase.rpc("save_recipe", {
    p_product_id: productId,
    p_items: items.map((item) => ({
      inventory_item_id: item.inventoryItemId,
      quantity: item.quantity,
      unit: item.unit,
    })),
  })

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/recipes")
  return { error: null }
}

export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId)

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/recipes")
  return { error: null }
}
