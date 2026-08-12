"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { toFriendlyError } from "@/lib/errors"
import type { InventoryUnit } from "@/types/database"

export type InventoryItemInput = {
  name: string
  sku: string | null
  unit: InventoryUnit
  minimum_quantity: number
  cost_per_unit: number
}

export async function createInventoryItem(
  input: InventoryItemInput,
  openingQuantity: number
) {
  const supabase = await createClient()

  const { error } = await supabase.rpc(
    "create_inventory_item_with_opening_stock",
    {
      p_name: input.name,
      p_sku: input.sku,
      p_unit: input.unit,
      p_minimum_quantity: input.minimum_quantity,
      p_cost_per_unit: input.cost_per_unit,
      p_opening_quantity: openingQuantity,
    }
  )

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/inventory")
  return { error: null }
}

export async function updateInventoryItem(id: string, input: InventoryItemInput) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("inventory_items")
    .update(input)
    .eq("id", id)

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/inventory")
  return { error: null }
}

export async function setInventoryItemActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("inventory_items")
    .update({ active })
    .eq("id", id)

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/inventory")
  return { error: null }
}

export type ReceiveStockInput = {
  inventory_item_id: string
  quantity: number
  cost_per_unit: number | null
  note: string | null
}

export async function receiveStock(input: ReceiveStockInput) {
  if (input.quantity <= 0) {
    return { error: "Quantity received must be greater than zero" }
  }

  const supabase = await createClient()

  const { error } = await supabase.rpc("receive_stock", {
    p_inventory_item_id: input.inventory_item_id,
    p_quantity: input.quantity,
    p_cost_per_unit: input.cost_per_unit,
    p_note: input.note,
  })

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/inventory")
  return { error: null }
}

export type AdjustmentReason =
  | "count_correction"
  | "damaged"
  | "waste"
  | "missing"

export type AdjustStockInput = {
  inventory_item_id: string
  reason: AdjustmentReason
  note: string
} & (
  | { mode: "set"; target_quantity: number }
  | { mode: "delta"; amount: number }
)

const REASON_LABELS: Record<AdjustmentReason, string> = {
  count_correction: "Physical count correction",
  damaged: "Damaged stock",
  waste: "Waste",
  missing: "Missing stock",
}

export async function adjustStock(input: AdjustStockInput) {
  if (!input.note.trim()) {
    return { error: "A reason is required for manual adjustments" }
  }

  const supabase = await createClient()
  const movementType =
    input.reason === "damaged" || input.reason === "waste" ? "waste" : "adjustment"
  const note = `${REASON_LABELS[input.reason]}: ${input.note.trim()}`

  const { error } = await supabase.rpc("adjust_stock", {
    p_inventory_item_id: input.inventory_item_id,
    p_movement_type: movementType,
    p_mode: input.mode,
    p_value: input.mode === "set" ? input.target_quantity : input.amount,
    p_note: note,
  })

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/inventory")
  return { error: null }
}
