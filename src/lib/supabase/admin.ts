import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Service-role client for privileged operations that have no RLS path
 * of their own — right now, just inviting a new staff member by email
 * (auth.admin.inviteUserByEmail). Never import this from a Client
 * Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser; the
 * `server-only` import above makes any accidental client-side import a
 * build error rather than a leaked key. Every caller must do its own
 * authorization check first — this client bypasses RLS entirely.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
