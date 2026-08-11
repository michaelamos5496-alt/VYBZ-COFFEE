"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { InventoryUnit } from "@/types/database"

export type InventoryItemInput = {
  name: string
  sku: string | null
  unit: InventoryUnit
  minimum_quantity: number
  cost_per_unit: number
}

async function getCurrentStaffId(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function createInventoryItem(
  input: InventoryItemInput,
  openingQuantity: number
) {
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from("inventory_items")
    .insert({ ...input, current_quantity: 0 })
    .select("id")
    .single()

  if (error || !item) {
    return { error: error?.message ?? "Could not create inventory item" }
  }

  if (openingQuantity > 0) {
    const createdBy = await getCurrentStaffId(supabase)
    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert({
        inventory_item_id: item.id,
        movement_type: "opening_stock",
        quantity: openingQuantity,
        note: "Opening stock",
        created_by: createdBy,
      })

    if (movementError) {
      return { error: movementError.message }
    }
  }

  revalidatePath("/inventory")
  return { error: null }
}

export async function updateInventoryItem(id: string, input: InventoryItemInput) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("inventory_items")
    .update(input)
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/inventory")
  return { error: null }
}

export async function setInventoryItemActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("inventory_items")
    .update({ active })
    .eq("id", id)

  if (error) return { error: error.message }

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
  const createdBy = await getCurrentStaffId(supabase)

  const { error } = await supabase.from("stock_movements").insert({
    inventory_item_id: input.inventory_item_id,
    movement_type: "purchase",
    quantity: input.quantity,
    note: input.note,
    created_by: createdBy,
  })

  if (error) return { error: error.message }

  if (input.cost_per_unit !== null) {
    const { error: costError } = await supabase
      .from("inventory_items")
      .update({ cost_per_unit: input.cost_per_unit })
      .eq("id", input.inventory_item_id)

    if (costError) return { error: costError.message }
  }

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

  let quantity: number

  if (input.mode === "set") {
    const { data: item, error: fetchError } = await supabase
      .from("inventory_items")
      .select("current_quantity")
      .eq("id", input.inventory_item_id)
      .single()

    if (fetchError || !item) {
      return { error: fetchError?.message ?? "Inventory item not found" }
    }

    quantity = input.target_quantity - Number(item.current_quantity)

    if (quantity === 0) {
      return { error: "New quantity matches the current quantity" }
    }
  } else {
    if (input.amount <= 0) {
      return { error: "Quantity must be greater than zero" }
    }
    quantity = -input.amount
  }

  const movementType = input.reason === "damaged" || input.reason === "waste"
    ? "waste"
    : "adjustment"

  const createdBy = await getCurrentStaffId(supabase)

  const { error } = await supabase.from("stock_movements").insert({
    inventory_item_id: input.inventory_item_id,
    movement_type: movementType,
    quantity,
    note: `${REASON_LABELS[input.reason]}: ${input.note.trim()}`,
    created_by: createdBy,
  })

  if (error) return { error: error.message }

  revalidatePath("/inventory")
  return { error: null }
}
