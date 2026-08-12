import { createClient } from "@/lib/supabase/server"
import type { Staff } from "@/types/database"

/** The signed-in user's staff record (id, name, role, active), or null if not signed in or not yet provisioned. */
export async function getCurrentStaff(): Promise<Staff | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("id", user.id)
    .single()

  return staff ?? null
}
