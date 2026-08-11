import type { InventoryUnit } from "@/types/database"
import { convertQuantity, IncompatibleUnitError } from "./units"

export type SaleItem = {
  productId: string
  quantity: number
}

export type RecipeIngredient = {
  inventoryItemId: string
  quantity: number
  unit: InventoryUnit
}

/** Maps a product id to the ingredient lines of its recipe. Products with no entry are treated as having no recipe (nothing is deducted for them). */
export type RecipeMap = Record<string, RecipeIngredient[]>

export type InventorySnapshotEntry = {
  currentQuantity: number
  unit: InventoryUnit
  name?: string
}

/** Maps an inventory item id to its current stock. */
export type InventorySnapshot = Record<string, InventorySnapshotEntry>

export type PlannedMovement = {
  inventoryItemId: string
  /** Signed delta in the inventory item's native unit (negative for a sale). */
  quantity: number
  previousQuantity: number
  newQuantity: number
}

export type PlanSaleResult =
  | { ok: true; movements: PlannedMovement[] }
  | { ok: false; error: string }

/**
 * Computes the stock movements a sale would produce, without mutating
 * anything. Requirements across all sale lines are aggregated per
 * inventory item first, then checked against the snapshot — so a sale is
 * only ever planned in full or not at all, mirroring the atomicity the
 * `process_sale` database function enforces for real.
 */
export function planSale(
  saleItems: SaleItem[],
  recipes: RecipeMap,
  inventory: InventorySnapshot
): PlanSaleResult {
  for (const item of saleItems) {
    if (item.quantity <= 0) {
      return {
        ok: false,
        error: `Sale quantity must be greater than zero for product ${item.productId}`,
      }
    }
  }

  const required = new Map<string, number>()

  for (const item of saleItems) {
    const ingredients = recipes[item.productId] ?? []

    for (const ingredient of ingredients) {
      const inventoryItem = inventory[ingredient.inventoryItemId]
      if (!inventoryItem) {
        return {
          ok: false,
          error: `Inventory item ${ingredient.inventoryItemId} not found`,
        }
      }

      let convertedQuantity: number
      try {
        convertedQuantity = convertQuantity(
          ingredient.quantity * item.quantity,
          ingredient.unit,
          inventoryItem.unit
        )
      } catch (err) {
        if (err instanceof IncompatibleUnitError) {
          return { ok: false, error: err.message }
        }
        throw err
      }

      required.set(
        ingredient.inventoryItemId,
        (required.get(ingredient.inventoryItemId) ?? 0) + convertedQuantity
      )
    }
  }

  const movements: PlannedMovement[] = []

  for (const [inventoryItemId, requiredQuantity] of required) {
    const inventoryItem = inventory[inventoryItemId]
    const previousQuantity = inventoryItem.currentQuantity
    const newQuantity = previousQuantity - requiredQuantity

    if (newQuantity < 0) {
      const label = inventoryItem.name ?? inventoryItemId
      return {
        ok: false,
        error: `Insufficient stock for ${label}: need ${requiredQuantity}${inventoryItem.unit}, have ${previousQuantity}${inventoryItem.unit}`,
      }
    }

    movements.push({
      inventoryItemId,
      quantity: -requiredQuantity,
      previousQuantity,
      newQuantity,
    })
  }

  return { ok: true, movements }
}
