"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type ProductInput = {
  name: string
  category_id: string | null
  sku: string | null
  selling_price: number
  description: string | null
  image_url: string | null
}

export async function createProduct(input: ProductInput) {
  const supabase = await createClient()
  const { error } = await supabase.from("products").insert(input)

  if (error) return { error: error.message }

  revalidatePath("/products")
  return { error: null }
}

export async function updateProduct(id: string, input: ProductInput) {
  const supabase = await createClient()
  const { error } = await supabase.from("products").update(input).eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/products")
  return { error: null }
}

export async function setProductActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/products")
  return { error: null }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/products")
  return { error: null }
}
