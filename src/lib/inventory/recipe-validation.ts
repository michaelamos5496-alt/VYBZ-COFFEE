import type { InventoryUnit } from "@/types/database"
import { unitsAreCompatible } from "./units"

export type RecipeItemDraft = {
  inventoryItemId: string
  quantity: number
  unit: InventoryUnit
}

export type InventoryItemLookup = Record<string, { unit: InventoryUnit }>

export type ValidateRecipeResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Shared validation for recipe writes (used by both the recipe editor
 * and the `save_recipe` server action before it hits the database):
 * no duplicate ingredients, positive quantities, and every line's unit
 * must be compatible with the ingredient's stocked unit.
 */
export function validateRecipeItems(
  items: RecipeItemDraft[],
  inventoryItems: InventoryItemLookup
): ValidateRecipeResult {
  const seen = new Set<string>()

  for (const item of items) {
    if (seen.has(item.inventoryItemId)) {
      return { ok: false, error: "Duplicate ingredient in recipe" }
    }
    seen.add(item.inventoryItemId)

    if (item.quantity <= 0) {
      return {
        ok: false,
        error: "Ingredient quantity must be greater than zero",
      }
    }

    const inventoryItem = inventoryItems[item.inventoryItemId]
    if (!inventoryItem) {
      return {
        ok: false,
        error: `Inventory item ${item.inventoryItemId} not found`,
      }
    }

    if (!unitsAreCompatible(item.unit, inventoryItem.unit)) {
      return {
        ok: false,
        error: `${item.unit} is not compatible with ${inventoryItem.unit}`,
      }
    }
  }

  return { ok: true }
}
