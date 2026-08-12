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
  email: "preview@janedoecafe.local",
}

// Lets a local preview be clicked through as each role without a real
// multi-account Supabase project: set NEXT_PUBLIC_PREVIEW_ROLE=admin |
// manager | cashier. Defaults to admin (the fullest view of the app).
const PREVIEW_ROLE = (process.env.NEXT_PUBLIC_PREVIEW_ROLE ?? "admin") as
  | "admin"
  | "manager"
  | "cashier"

const NOT_AVAILABLE_RESULT = {
  data: null,
  error: { message: "Not available in local preview — connect a Supabase project to save changes." },
}

const ACCESS_DENIED_RESULT = {
  data: null,
  error: { message: "Access denied" },
}

const now = new Date().toISOString()

const PREVIEW_STAFF_ROW = {
  id: PREVIEW_USER.id,
  name: `Preview ${PREVIEW_ROLE[0].toUpperCase()}${PREVIEW_ROLE.slice(1)}`,
  email: PREVIEW_USER.email,
  role: PREVIEW_ROLE,
  active: true,
  created_at: now,
  updated_at: now,
}

// A small set of realistic sample rows so the local preview can actually
// be clicked through (add to cart, checkout, etc.), not just show empty
// states. Purely additive and read-only — writes still resolve
// NOT_AVAILABLE_RESULT, so nothing here is ever persisted.
const LIST_DEFAULTS: Record<string, Record<string, unknown>[]> = {
  categories: [
    { id: "preview-cat-coffee", name: "Coffee", description: null, active: true, sort_order: 0, created_at: now, updated_at: now },
    { id: "preview-cat-tea", name: "Tea", description: null, active: true, sort_order: 1, created_at: now, updated_at: now },
    { id: "preview-cat-pastries", name: "Pastries", description: null, active: true, sort_order: 2, created_at: now, updated_at: now },
    { id: "preview-cat-german", name: "German Baking", description: null, active: true, sort_order: 3, created_at: now, updated_at: now },
    { id: "preview-cat-ghanaian", name: "Ghanaian Baking", description: null, active: true, sort_order: 4, created_at: now, updated_at: now },
  ],
  products: [
    // Coffee
    { id: "preview-prod-cappuccino", category_id: "preview-cat-coffee", name: "Cappuccino", description: null, sku: "1234567890", selling_price: 35, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-latte", category_id: "preview-cat-coffee", name: "Latte", description: null, sku: null, selling_price: 38, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-americano", category_id: "preview-cat-coffee", name: "Americano", description: null, sku: null, selling_price: 28, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-espresso", category_id: "preview-cat-coffee", name: "Espresso", description: null, sku: null, selling_price: 22, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-macchiato", category_id: "preview-cat-coffee", name: "Macchiato", description: null, sku: null, selling_price: 32, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-mocha", category_id: "preview-cat-coffee", name: "Mocha", description: null, sku: null, selling_price: 40, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-flat-white", category_id: "preview-cat-coffee", name: "Flat White", description: null, sku: null, selling_price: 36, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-cold-brew", category_id: "preview-cat-coffee", name: "Cold Brew", description: null, sku: null, selling_price: 30, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-affogato", category_id: "preview-cat-coffee", name: "Affogato", description: null, sku: null, selling_price: 34, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-caramel-macchiato", category_id: "preview-cat-coffee", name: "Caramel Macchiato", description: null, sku: null, selling_price: 40, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-turkish-coffee", category_id: "preview-cat-coffee", name: "Turkish Coffee", description: null, sku: null, selling_price: 26, image_url: null, active: true, created_at: now, updated_at: now },
    // Tea
    { id: "preview-prod-green-tea", category_id: "preview-cat-tea", name: "Green Tea", description: null, sku: null, selling_price: 18, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-black-tea", category_id: "preview-cat-tea", name: "Black Tea", description: null, sku: null, selling_price: 16, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-chai-latte", category_id: "preview-cat-tea", name: "Chai Latte", description: null, sku: null, selling_price: 26, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-hibiscus-tea", category_id: "preview-cat-tea", name: "Hibiscus Tea (Sobolo)", description: null, sku: null, selling_price: 16, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-lemongrass-tea", category_id: "preview-cat-tea", name: "Lemongrass Tea", description: null, sku: null, selling_price: 16, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-earl-grey", category_id: "preview-cat-tea", name: "Earl Grey", description: null, sku: null, selling_price: 17, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-mint-tea", category_id: "preview-cat-tea", name: "Mint Tea", description: null, sku: null, selling_price: 16, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-ginger-tea", category_id: "preview-cat-tea", name: "Ginger Tea", description: null, sku: null, selling_price: 16, image_url: null, active: true, created_at: now, updated_at: now },
    // Pastries
    { id: "preview-prod-croissant", category_id: "preview-cat-pastries", name: "Croissant", description: null, sku: null, selling_price: 22, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-danish", category_id: "preview-cat-pastries", name: "Danish Pastry", description: null, sku: null, selling_price: 24, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-muffin", category_id: "preview-cat-pastries", name: "Blueberry Muffin", description: null, sku: null, selling_price: 20, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-cinnamon-roll", category_id: "preview-cat-pastries", name: "Cinnamon Roll", description: null, sku: null, selling_price: 25, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-scone", category_id: "preview-cat-pastries", name: "Scone", description: null, sku: null, selling_price: 20, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-chocolate-eclair", category_id: "preview-cat-pastries", name: "Chocolate Eclair", description: null, sku: null, selling_price: 26, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-almond-croissant", category_id: "preview-cat-pastries", name: "Almond Croissant", description: null, sku: null, selling_price: 27, image_url: null, active: true, created_at: now, updated_at: now },
    // German Baking
    { id: "preview-prod-pretzel", category_id: "preview-cat-german", name: "Butter Pretzel (Brezel)", description: null, sku: null, selling_price: 20, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-black-forest", category_id: "preview-cat-german", name: "Black Forest Cake Slice", description: null, sku: null, selling_price: 32, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-streuselkuchen", category_id: "preview-cat-german", name: "Streuselkuchen", description: null, sku: null, selling_price: 28, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-berliner", category_id: "preview-cat-german", name: "Berliner Doughnut", description: null, sku: null, selling_price: 18, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-apfelstrudel", category_id: "preview-cat-german", name: "Apfelstrudel", description: null, sku: null, selling_price: 30, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-lebkuchen", category_id: "preview-cat-german", name: "Lebkuchen", description: null, sku: null, selling_price: 15, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-stollen", category_id: "preview-cat-german", name: "Stollen Slice", description: null, sku: null, selling_price: 26, image_url: null, active: true, created_at: now, updated_at: now },
    // Ghanaian Baking
    { id: "preview-prod-meatpie", category_id: "preview-cat-ghanaian", name: "Meat Pie", description: null, sku: null, selling_price: 15, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-tea-bread", category_id: "preview-cat-ghanaian", name: "Tea Bread", description: null, sku: null, selling_price: 12, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-butter-bread", category_id: "preview-cat-ghanaian", name: "Butter Bread", description: null, sku: null, selling_price: 14, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-chin-chin", category_id: "preview-cat-ghanaian", name: "Chin Chin", description: null, sku: null, selling_price: 10, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-bofrot", category_id: "preview-cat-ghanaian", name: "Bofrot", description: null, sku: null, selling_price: 8, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-sugar-bread", category_id: "preview-cat-ghanaian", name: "Sugar Bread", description: null, sku: null, selling_price: 13, image_url: null, active: true, created_at: now, updated_at: now },
    { id: "preview-prod-coconut-bread", category_id: "preview-cat-ghanaian", name: "Coconut Bread", description: null, sku: null, selling_price: 14, image_url: null, active: true, created_at: now, updated_at: now },
  ],
  inventory_items: [
    { id: "preview-item-beans", name: "Coffee Beans", sku: null, unit: "kg", current_quantity: 5, minimum_quantity: 1, cost_per_unit: 85, active: true, created_at: now, updated_at: now },
    { id: "preview-item-milk", name: "Milk", sku: null, unit: "litre", current_quantity: 12, minimum_quantity: 3, cost_per_unit: 12, active: true, created_at: now, updated_at: now },
    { id: "preview-item-cups", name: "Cups", sku: null, unit: "piece", current_quantity: 40, minimum_quantity: 50, cost_per_unit: 0.5, active: true, created_at: now, updated_at: now },
  ],
  staff: [PREVIEW_STAFF_ROW],
  inventory_report: [
    { id: "preview-item-beans", name: "Coffee Beans", sku: null, unit: "kg", current_quantity: 5, minimum_quantity: 1, cost_per_unit: 85, active: true, created_at: now, updated_at: now, stock_status: "normal" },
    { id: "preview-item-milk", name: "Milk", sku: null, unit: "litre", current_quantity: 12, minimum_quantity: 3, cost_per_unit: 12, active: true, created_at: now, updated_at: now, stock_status: "normal" },
    { id: "preview-item-cups", name: "Cups", sku: null, unit: "piece", current_quantity: 40, minimum_quantity: 50, cost_per_unit: 0.5, active: true, created_at: now, updated_at: now, stock_status: "low_stock" },
  ],
}

const PREVIEW_PAYMENT_METHODS = ["cash", "mobile_money", "card"] as const

function previewSalesByDay(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const day = new Date()
    day.setUTCDate(day.getUTCDate() - (days - 1 - i))
    const isWeekend = [0, 6].includes(day.getUTCDay())
    const orderCount = isWeekend ? 8 + (i % 4) : 4 + (i % 5)
    return {
      day: day.toISOString().slice(0, 10),
      revenue: orderCount * 32.5,
      order_count: orderCount,
    }
  })
}

function previewSalesByHourToday() {
  return Array.from({ length: 24 }, (_, hour) => {
    const active = hour >= 7 && hour <= 18
    const orderCount = active ? Math.max(0, 3 - Math.abs(hour - 10) / 3) | 0 : 0
    return { hour, revenue: orderCount * 30, order_count: orderCount }
  })
}

function previewSearchOrders(
  limit: number,
  offset: number,
  role: "admin" | "manager" | "cashier"
) {
  // Half the sample orders belong to the preview user, half to a
  // colleague — lets a cashier's "own sales only" scoping actually show
  // a visible difference from admin/manager's "everyone" view.
  const all = Array.from({ length: 18 }, (_, i) => {
    const completedAt = new Date()
    completedAt.setUTCHours(completedAt.getUTCHours() - i * 3)
    const method = PREVIEW_PAYMENT_METHODS[i % PREVIEW_PAYMENT_METHODS.length]
    const isMine = i % 2 === 0
    return {
      id: `preview-order-${i}`,
      order_number: 1000 + i,
      completed_at: completedAt.toISOString(),
      cashier_name: isMine ? PREVIEW_STAFF_ROW.name : "A. Colleague",
      cashier_id: isMine ? PREVIEW_USER.id : "preview-other-staff",
      total: 28 + i * 3.5,
      payment_method: method,
      status: "completed",
      payment_status: "paid",
    }
  })
  const scoped = role === "cashier" ? all.filter((row) => row.cashier_id === PREVIEW_USER.id) : all
  return scoped
    .slice(offset, offset + limit)
    .map((row) => ({ ...row, total_count: scoped.length }))
}

function previewProductPerformance(limit: number, offset: number) {
  const catalog = LIST_DEFAULTS.products
  const units = [42, 35, 21, 18, 9]
  const all = catalog.map((product, i) => ({
    product_id: product.id as string,
    product_name: product.name as string,
    units_sold: units[i] ?? 5,
    revenue: (units[i] ?? 5) * (product.selling_price as number),
  }))
  const grandTotal = all.reduce((sum, row) => sum + row.revenue, 0) || 1
  const withShare = all
    .map((row) => ({
      ...row,
      percentage_of_sales: Math.round((row.revenue / grandTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.revenue - a.revenue)
  return withShare
    .slice(offset, offset + limit)
    .map((row) => ({ ...row, total_count: withShare.length }))
}

// Mirrors the role guard inside these functions in
// supabase/migrations/00007_rbac.sql: business-wide report RPCs raise
// for a cashier; search_orders instead silently scopes to their own id.
const ADMIN_MANAGER_ONLY_RPCS = new Set([
  "dashboard_stats",
  "sales_by_day",
  "sales_by_hour_today",
  "payment_breakdown",
  "product_performance",
])

const READ_ONLY_RPCS: Record<string, (args: Record<string, unknown>) => unknown[]> = {
  dashboard_stats: () => [
    { total_sales: 452.5, order_count: 12, average_order_value: 37.71 },
  ],
  sales_by_day: (args) => previewSalesByDay(Number(args.p_days) || 7),
  sales_by_hour_today: () => previewSalesByHourToday(),
  payment_breakdown: () => [
    { payment_method: "cash", transaction_count: 7, total_value: 245 },
    { payment_method: "mobile_money", transaction_count: 4, total_value: 156.5 },
    { payment_method: "card", transaction_count: 1, total_value: 51 },
  ],
  product_performance: (args) =>
    previewProductPerformance(Number(args.p_limit) || 50, Number(args.p_offset) || 0),
  search_orders: (args) =>
    previewSearchOrders(Number(args.p_limit) || 25, Number(args.p_offset) || 0, PREVIEW_ROLE),
}

function emptyResultFor(table: string) {
  return { data: LIST_DEFAULTS[table] ?? [], error: null, count: (LIST_DEFAULTS[table] ?? []).length }
}

const SINGLE_ROW_DEFAULTS: Record<string, Record<string, unknown>> = {
  staff: PREVIEW_STAFF_ROW,
  business_settings: {
    id: "00000000-0000-0000-0000-000000000001",
    business_name: "JANE DOE CAFE",
    logo_url: null,
    phone: null,
    email: null,
    address: null,
    currency: "GHS",
    receipt_footer: null,
    tax_rate: 0,
    tax_inclusive: true,
    payment_methods: ["cash", "card", "mobile_money"],
    receipt_paper_width: "80mm",
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
    rpc(name: string, args: Record<string, unknown> = {}) {
      if (ADMIN_MANAGER_ONLY_RPCS.has(name) && PREVIEW_ROLE === "cashier") {
        return {
          then: (resolve: (value: unknown) => void) => resolve(ACCESS_DENIED_RESULT),
        }
      }
      const reader = READ_ONLY_RPCS[name]
      if (!reader) {
        return createQueryBuilder("rpc", true)
      }
      const data = reader(args)
      return {
        then: (resolve: (value: unknown) => void) => resolve({ data, error: null }),
      }
    },
  } as unknown as SupabaseClient<Database>
}

export function isPreviewMode() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL
}
