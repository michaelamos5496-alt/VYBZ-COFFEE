import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Local-preview-only fallback. When NEXT_PUBLIC_SUPABASE_URL isn't set
// (no Supabase project connected yet), the real client factories return
// this instead so the app can still render — every query resolves to
// empty data, which the app already renders as its built-in empty
// states, and every mutation resolves to a clean "not available in
// preview" error via the existing error-toast paths. Once real
// credentials are set, this is never touched.

const PREVIEW_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "preview@marvincoffee.local",
}

const EMPTY_RESULT = { data: [], error: null, count: 0 }
const NOT_AVAILABLE_RESULT = {
  data: null,
  error: { message: "Not available in local preview — connect a Supabase project to save changes." },
}

const SINGLE_ROW_DEFAULTS: Record<string, Record<string, unknown>> = {
  business_settings: {
    id: "00000000-0000-0000-0000-000000000001",
    business_name: "Marvin Coffee Spot",
    logo_url: null,
    phone: null,
    email: null,
    address: null,
    currency: "GHS",
    receipt_footer: null,
    tax_rate: 0,
    tax_inclusive: true,
    payment_methods: ["cash", "card", "mobile_money"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

function isSingleTerminal(prop: string) {
  return prop === "single" || prop === "maybeSingle"
}

function createQueryBuilder(table: string, isWrite: boolean): unknown {
  const resolved = isWrite ? NOT_AVAILABLE_RESULT : EMPTY_RESULT

  const target = () => {}
  const handler: ProxyHandler<typeof target> = {
    get(_t, prop: string) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void) => resolve(resolved)
      }
      if (prop === "insert" || prop === "update" || prop === "delete" || prop === "upsert") {
        return () => createQueryBuilder(table, true)
      }
      if (isSingleTerminal(prop)) {
        return () =>
          Promise.resolve(
            isWrite
              ? NOT_AVAILABLE_RESULT
              : { data: SINGLE_ROW_DEFAULTS[table] ?? null, error: null }
          )
      }
      return () => createQueryBuilder(table, isWrite)
    },
  }
  return new Proxy(target, handler)
}

export function createPreviewMockClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: PREVIEW_USER }, error: null }
      },
      async signInWithPassword() {
        return {
          data: { user: null, session: null },
          error: { message: "Local preview has no real auth — connect a Supabase project to sign in." },
        }
      },
      async signOut() {
        return { error: null }
      },
      async exchangeCodeForSession() {
        return { error: { message: "Not available in local preview" } }
      },
    },
    from(table: string) {
      return createQueryBuilder(table, false)
    },
    rpc() {
      return createQueryBuilder("rpc", true)
    },
  } as unknown as SupabaseClient<Database>
}

export function isPreviewMode() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL
}
