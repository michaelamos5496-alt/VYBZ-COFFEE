import { describe, expect, it } from "vitest"

import { planSale, type InventorySnapshot, type RecipeMap } from "./deduction-engine"

const CAPPUCCINO = "product-cappuccino"
const LATTE = "product-latte"
const COFFEE_BEANS = "item-coffee-beans"
const MILK = "item-milk"
const CUP = "item-cup"

const recipes: RecipeMap = {
  [CAPPUCCINO]: [
    { inventoryItemId: COFFEE_BEANS, quantity: 18, unit: "g" },
    { inventoryItemId: MILK, quantity: 200, unit: "ml" },
    { inventoryItemId: CUP, quantity: 1, unit: "piece" },
  ],
  [LATTE]: [
    { inventoryItemId: COFFEE_BEANS, quantity: 18, unit: "g" },
    { inventoryItemId: MILK, quantity: 250, unit: "ml" },
    { inventoryItemId: CUP, quantity: 1, unit: "piece" },
  ],
}

function snapshot(overrides: Partial<InventorySnapshot> = {}): InventorySnapshot {
  return {
    [COFFEE_BEANS]: { currentQuantity: 1000, unit: "g", name: "Coffee Beans" },
    [MILK]: { currentQuantity: 2000, unit: "ml", name: "Milk" },
    [CUP]: { currentQuantity: 50, unit: "piece", name: "Cup" },
    ...overrides,
  }
}

describe("planSale — correct deduction", () => {
  it("deducts exactly the recipe quantities for one unit sold", () => {
    const result = planSale([{ productId: CAPPUCCINO, quantity: 1 }], recipes, snapshot())

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const byItem = Object.fromEntries(
      result.movements.map((m) => [m.inventoryItemId, m])
    )

    expect(byItem[COFFEE_BEANS].quantity).toBe(-18)
    expect(byItem[MILK].quantity).toBe(-200)
    expect(byItem[CUP].quantity).toBe(-1)
  })
})

describe("planSale — multiple quantity deduction", () => {
  it("scales deduction linearly with quantity sold", () => {
    const result = planSale([{ productId: CAPPUCCINO, quantity: 3 }], recipes, snapshot())

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const byItem = Object.fromEntries(
      result.movements.map((m) => [m.inventoryItemId, m])
    )

    expect(byItem[COFFEE_BEANS].quantity).toBe(-54)
    expect(byItem[MILK].quantity).toBe(-600)
    expect(byItem[CUP].quantity).toBe(-3)
  })

  it("aggregates a shared ingredient across multiple products in one sale", () => {
    const result = planSale(
      [
        { productId: CAPPUCCINO, quantity: 2 },
        { productId: LATTE, quantity: 1 },
      ],
      recipes,
      snapshot()
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const byItem = Object.fromEntries(
      result.movements.map((m) => [m.inventoryItemId, m])
    )

    // 2 cappuccino * 18g + 1 latte * 18g
    expect(byItem[COFFEE_BEANS].quantity).toBe(-54)
    // 2 * 200ml + 1 * 250ml
    expect(byItem[MILK].quantity).toBe(-650)
    expect(byItem[CUP].quantity).toBe(-3)
  })
})

describe("planSale — insufficient stock", () => {
  it("rejects the sale with a clear error when stock is short", () => {
    const result = planSale(
      [{ productId: CAPPUCCINO, quantity: 3 }],
      recipes,
      snapshot({ [MILK]: { currentQuantity: 400, unit: "ml", name: "Milk" } })
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/insufficient stock/i)
    expect(result.error).toMatch(/milk/i)
  })
})

describe("planSale — atomic rollback", () => {
  it("produces no movements at all when any single ingredient is short", () => {
    // Coffee beans and cups are plentiful; milk is short. A naive
    // sequential implementation might deduct beans and cups before
    // discovering milk is short — planSale must not do that.
    const result = planSale(
      [{ productId: CAPPUCCINO, quantity: 3 }],
      recipes,
      snapshot({ [MILK]: { currentQuantity: 400, unit: "ml", name: "Milk" } })
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    // @ts-expect-error movements only exists on the ok branch
    expect(result.movements).toBeUndefined()
  })

  it("rejects the whole multi-product sale if any product's requirement can't be met", () => {
    const result = planSale(
      [
        { productId: CAPPUCCINO, quantity: 1 },
        { productId: LATTE, quantity: 100 }, // absurd quantity, milk runs out
      ],
      recipes,
      snapshot()
    )

    expect(result.ok).toBe(false)
  })
})

describe("planSale — stock movement shape", () => {
  it("returns previous and new quantity alongside the signed delta", () => {
    const result = planSale([{ productId: CAPPUCCINO, quantity: 1 }], recipes, snapshot())

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const milkMovement = result.movements.find((m) => m.inventoryItemId === MILK)
    expect(milkMovement).toEqual({
      inventoryItemId: MILK,
      quantity: -200,
      previousQuantity: 2000,
      newQuantity: 1800,
    })
  })
})

describe("planSale — unit conversion", () => {
  it("converts a gram-based recipe line against a kilogram-tracked ingredient", () => {
    const result = planSale(
      [{ productId: CAPPUCCINO, quantity: 1 }],
      recipes,
      snapshot({
        [COFFEE_BEANS]: { currentQuantity: 5, unit: "kg", name: "Coffee Beans" },
      })
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const beans = result.movements.find((m) => m.inventoryItemId === COFFEE_BEANS)
    // 18g deducted from a 5kg (5000g) balance -> 0.018kg
    expect(beans?.quantity).toBeCloseTo(-0.018)
    expect(beans?.newQuantity).toBeCloseTo(4.982)
  })

  it("rejects a recipe line whose unit is incompatible with the ingredient's unit", () => {
    const result = planSale(
      [{ productId: CAPPUCCINO, quantity: 1 }],
      {
        [CAPPUCCINO]: [{ inventoryItemId: CUP, quantity: 1, unit: "g" }],
      },
      snapshot()
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/incompatible units/i)
  })
})

describe("planSale — preventing negative stock", () => {
  it("allows a sale that exactly exhausts stock", () => {
    const result = planSale(
      [{ productId: CAPPUCCINO, quantity: 1 }],
      recipes,
      snapshot({ [CUP]: { currentQuantity: 1, unit: "piece", name: "Cup" } })
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const cup = result.movements.find((m) => m.inventoryItemId === CUP)
    expect(cup?.newQuantity).toBe(0)
  })

  it("rejects a sale that would take stock below zero", () => {
    const result = planSale(
      [{ productId: CAPPUCCINO, quantity: 1 }],
      recipes,
      snapshot({ [CUP]: { currentQuantity: 0, unit: "piece", name: "Cup" } })
    )

    expect(result.ok).toBe(false)
  })

  it("never returns a movement with a negative newQuantity", () => {
    const result = planSale([{ productId: CAPPUCCINO, quantity: 5 }], recipes, snapshot())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const movement of result.movements) {
      expect(movement.newQuantity).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("planSale — invalid input", () => {
  it("rejects a zero or negative sale quantity", () => {
    expect(planSale([{ productId: CAPPUCCINO, quantity: 0 }], recipes, snapshot()).ok).toBe(false)
    expect(planSale([{ productId: CAPPUCCINO, quantity: -1 }], recipes, snapshot()).ok).toBe(false)
  })

  it("treats a product with no recipe as having nothing to deduct", () => {
    const result = planSale(
      [{ productId: "product-with-no-recipe", quantity: 2 }],
      recipes,
      snapshot()
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.movements).toEqual([])
  })
})
