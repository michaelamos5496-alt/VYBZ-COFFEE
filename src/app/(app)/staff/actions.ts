"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { toFriendlyError } from "@/lib/errors"
import { canManageStaff } from "@/lib/auth/permissions"
import type { StaffRole } from "@/types/database"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "You need to sign in again." }

  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!canManageStaff(staff?.role ?? null)) {
    return { error: "Only admins can manage staff." }
  }

  return { error: null }
}

export type InviteStaffInput = {
  name: string
  email: string
  role: StaffRole
}

export async function inviteStaff(input: InviteStaffInput) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return { error: authCheck.error }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      error:
        "Staff invitations aren't configured yet — this needs SUPABASE_SERVICE_ROLE_KEY set.",
    }
  }

  const { error } = await adminClient.auth.admin.inviteUserByEmail(input.email, {
    data: { name: input.name, role: input.role },
  })

  if (error) return { error: error.message }

  revalidatePath("/staff")
  return { error: null }
}

export type UpdateStaffInput = {
  name: string
  role: StaffRole
  active: boolean
}

export async function updateStaff(id: string, input: UpdateStaffInput) {
  const authCheck = await requireAdmin()
  if (authCheck.error) return { error: authCheck.error }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id === id && (input.role !== "admin" || !input.active)) {
    return { error: "You can't remove your own admin access or deactivate yourself." }
  }

  const { error } = await supabase.from("staff").update(input).eq("id", id)

  if (error) return { error: toFriendlyError(error) }

  revalidatePath("/staff")
  return { error: null }
}
