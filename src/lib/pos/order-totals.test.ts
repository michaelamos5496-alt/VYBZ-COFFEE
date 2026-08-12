import { describe, expect, it } from "vitest"

import {
  calculateChange,
  calculateOrderTotals,
  isCashSufficient,
} from "./order-totals"

describe("calculateOrderTotals — tax-inclusive pricing", () => {
  it("extracts the tax already included in the price, total unchanged by tax", () => {
    // GH₵35 menu price already includes 12.5% tax
    const result = calculateOrderTotals(35, 0, { taxRate: 12.5, taxInclusive: true })

    expect(result.total).toBe(35)
    expect(result.tax).toBeCloseTo(3.888888, 5)
  })

  it("returns zero tax when the tax rate is zero", () => {
    const result = calculateOrderTotals(100, 0, { taxRate: 0, taxInclusive: true })
    expect(result.tax).toBe(0)
    expect(result.total).toBe(100)
  })
})

describe("calculateOrderTotals — tax-exclusive pricing", () => {
  it("adds tax on top of the discounted subtotal", () => {
    const result = calculateOrderTotals(100, 0, { taxRate: 10, taxInclusive: false })
    expect(result.tax).toBe(10)
    expect(result.total).toBe(110)
  })
})

describe("calculateOrderTotals — discounts", () => {
  it("subtracts a flat discount before computing tax and total", () => {
    const result = calculateOrderTotals(100, 20, { taxRate: 10, taxInclusive: false })
    expect(result.discount).toBe(20)
    expect(result.tax).toBe(8) // 10% of the discounted 80
    expect(result.total).toBe(88)
  })

  it("supports a discount that brings the total to zero", () => {
    const result = calculateOrderTotals(50, 50, { taxRate: 10, taxInclusive: false })
    expect(result.total).toBe(0)
    expect(result.tax).toBe(0)
  })

  it("a zero discount leaves totals unaffected", () => {
    const withDiscount = calculateOrderTotals(100, 0, { taxRate: 10, taxInclusive: false })
    expect(withDiscount.total).toBe(110)
  })
})

describe("calculateChange", () => {
  it("computes change for cash tendered above the total", () => {
    expect(calculateChange(50, 35)).toBe(15)
  })

  it("returns zero when the exact amount is tendered", () => {
    expect(calculateChange(35, 35)).toBe(0)
  })

  it("returns a negative number when tendered amount is short", () => {
    expect(calculateChange(20, 35)).toBe(-15)
  })
})

describe("isCashSufficient", () => {
  it("accepts an amount equal to the total", () => {
    expect(isCashSufficient(35, 35)).toBe(true)
  })

  it("accepts an amount greater than the total", () => {
    expect(isCashSufficient(50, 35)).toBe(true)
  })

  it("rejects an amount less than the total", () => {
    expect(isCashSufficient(20, 35)).toBe(false)
  })
})
