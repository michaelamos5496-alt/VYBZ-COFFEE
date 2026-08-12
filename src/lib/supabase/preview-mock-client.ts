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

const NOT_AVAILABLE_RESULT = {
  data: null,
  error: { message: "Not available in local preview — connect a Supabase project to save changes." },
}

const now = new Date().toISOString()

// A small set of realistic sample rows so the local preview can actually
// be clicked through (add to cart, checkout, etc.), not just show empty
// states. Purely additive and read-only — writes still resolve
// NOT_AVAILABLE_RESULT, so nothing here is ever persisted.
const LIST_DEFAULTS: Record<string, Record<string, unknown>[]> = {
  categories: [
    { id: "preview-cat-coffee", name: "Coffee", description: null, active: true, sort_order: 0, created_at: now, updated_at: now },
    { id: "preview-cat-tea", name: "Tea", description: null, active: true, sort_order: 1, created_at: now, updated_at: now },
    { id: "preview-cat-pastries", name: "Pastries", description: null, active: true, sort_order: 2, created_at: now, updated_at: now },
  ],
  products: [
    { id: "preview-prod-cappuccino", category_id: "preview-cat-coffee", name: "Cappuccino", description: null, sku: null, selling_price: 35, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-latte", category_id: "preview-cat-coffee", name: "Latte", description: null, sku: null, selling_price: 38, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-americano", category_id: "preview-cat-coffee", name: "Americano", description: null, sku: null, selling_price: 28, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-green-tea", category_id: "preview-cat-tea", name: "Green Tea", description: null, sku: null, selling_price: 18, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-croissant", category_id: "preview-cat-pastries", name: "Croissant", description: null, sku: null, selling_price: 22, image_url: null, active: true, created_at: now, updated_at: now },
  ],
  inventory_items: [
    { id: "preview-item-beans", name: "Coffee Beans", sku: null, unit: "kg", current_quantity: 5, minimum_quantity: 1, cost_per_unit: 85, active: true, created_at: now, updated_at: now },
    { id: "preview-item-milk", name: "Milk", sku: null, unit: "litre", current_quantity: 12, minimum_quantity: 3, cost_per_unit: 12, active: true, created_at: now, updated_at: now },
  ],
}

function emptyResultFor(table: string) {
  return { data: LIST_DEFAULTS[table] ?? [], error: null, count: (LIST_DEFAULTS[table] ?? []).length }
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
  const resolved = isWrite ? NOT_AVAILABLE_RESULT : emptyResultFor(table)

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
