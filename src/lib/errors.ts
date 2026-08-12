export type RawDbError = {
  message: string
  code?: string
}

const DUPLICATE_HINTS: { match: RegExp; message: string }[] = [
  { match: /sku/i, message: "That SKU is already in use." },
  { match: /email/i, message: "That email is already in use." },
  { match: /product_id/i, message: "This product already has a recipe." },
  { match: /order_number/i, message: "That order number is already taken." },
  { match: /idempotency/i, message: "This sale was already processed." },
]

const FOREIGN_KEY_HINTS: { match: RegExp; message: string }[] = [
  {
    match: /order_items/i,
    message: "This can't be removed because it's part of a past order.",
  },
  {
    match: /recipe_items/i,
    message: "This can't be removed because a recipe still uses it.",
  },
  {
    match: /stock_movements/i,
    message: "This can't be removed because it has stock history.",
  },
]

/**
 * Maps a raw Postgres/PostgREST error to staff-friendly text. Our own
 * `raise exception '...'` messages throughout the SQL functions (e.g.
 * "Insufficient stock for Milk: need 600ml, have 400ml") are already
 * written in plain language — those pass through unchanged (Postgres
 * reports them with SQLSTATE P0001). Only raw constraint-violation
 * codes get rewritten here, since those come through as things like
 * `duplicate key value violates unique constraint "products_sku_key"`.
 */
export function toFriendlyError(error: RawDbError): string {
  const { message, code } = error

  if (code === "23505") {
    const hit = DUPLICATE_HINTS.find((hint) => hint.match.test(message))
    return hit?.message ?? "This already exists."
  }

  if (code === "23503") {
    const hit = FOREIGN_KEY_HINTS.find((hint) => hint.match.test(message))
    return hit?.message ?? "This is being used elsewhere and can't be removed."
  }

  if (code === "23502") {
    return "A required field is missing."
  }

  if (code === "23514") {
    return "That value isn't allowed."
  }

  if (code === "42501") {
    return "You don't have permission to do that."
  }

  return message
}
