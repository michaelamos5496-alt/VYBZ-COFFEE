"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { toFriendlyError } from "@/lib/errors"

export type CategoryInput = {
  name: string
  description: string | null
}

export async function createCategory(input: CategoryInput) {
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1

  const { error } = await supabase
    .from("categories")
    .insert({ ...input, sort_order: nextSortOrder })

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/products")
  return { error: null }
}

export async function updateCategory(id: string, input: CategoryInput) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id)

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/products")
  return { error: null }
}

export async function setCategoryActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("categories")
    .update({ active })
    .eq("id", id)

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/products")
  return { error: null }
}

export async function reorderCategory(id: string, direction: "up" | "down", orderedIds: string[]) {
  const supabase = await createClient()
  const index = orderedIds.indexOf(id)
  const swapWith = direction === "up" ? index - 1 : index + 1

  if (index === -1 || swapWith < 0 || swapWith >= orderedIds.length) {
    return { error: null }
  }

  const otherId = orderedIds[swapWith]

  const { data: rows, error: fetchError } = await supabase
    .from("categories")
    .select("id, sort_order")
    .in("id", [id, otherId])

  if (fetchError || !rows || rows.length !== 2) {
    return {
      error: fetchError ? toFriendlyError(fetchError) : "Could not reorder category",
    }
  }

  const current = rows.find((row) => row.id === id)!
  const other = rows.find((row) => row.id === otherId)!

  const first = await supabase
    .from("categories")
    .update({ sort_order: other.sort_order })
    .eq("id", current.id)

  if (first.error) return { error: toFriendlyError(first.error) }

  const second = await supabase
    .from("categories")
    .update({ sort_order: current.sort_order })
    .eq("id", other.id)

  if (second.error) return { error: toFriendlyError(second.error) }

  revalidatePath("/products")
  return { error: null }
}
