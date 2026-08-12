export type TaxSettings = {
  taxRate: number
  taxInclusive: boolean
}

export type OrderTotals = {
  subtotal: number
  discount: number
  tax: number
  total: number
}

/**
 * Mirrors the tax math in the `checkout_order` Postgres function exactly,
 * so the POS screen can show the cashier a live total before checkout —
 * the database recomputes the same thing server-side as the source of
 * truth.
 */
export function calculateOrderTotals(
  subtotal: number,
  discount: number,
  settings: TaxSettings
): OrderTotals {
  const discounted = subtotal - discount

  if (settings.taxInclusive) {
    const tax = discounted - discounted / (1 + settings.taxRate / 100)
    return { subtotal, discount, tax, total: discounted }
  }

  const tax = discounted * (settings.taxRate / 100)
  return { subtotal, discount, tax, total: discounted + tax }
}

/** Change = amount received - total. Negative means insufficient cash. */
export function calculateChange(amountReceived: number, total: number): number {
  return amountReceived - total
}

export function isCashSufficient(amountReceived: number, total: number): boolean {
  return amountReceived >= total
}
