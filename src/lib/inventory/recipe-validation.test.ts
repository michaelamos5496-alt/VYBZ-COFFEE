import { describe, expect, it } from "vitest"

import {
  validateRecipeItems,
  type InventoryItemLookup,
} from "./recipe-validation"

const COFFEE_BEANS = "item-coffee-beans"
const MILK = "item-milk"
const CUP = "item-cup"

const inventoryItems: InventoryItemLookup = {
  [COFFEE_BEANS]: { unit: "kg" },
  [MILK]: { unit: "ml" },
  [CUP]: { unit: "piece" },
}

describe("validateRecipeItems — recipe creation", () => {
  it("accepts a well-formed new recipe", () => {
    const result = validateRecipeItems(
      [
        { inventoryItemId: COFFEE_BEANS, quantity: 18, unit: "g" },
        { inventoryItemId: MILK, quantity: 200, unit: "ml" },
        { inventoryItemId: CUP, quantity: 1, unit: "piece" },
      ],
      inventoryItems
    )

    expect(result.ok).toBe(true)
  })

  it("rejects an ingredient that doesn't exist in inventory", () => {
    const result = validateRecipeItems(
      [{ inventoryItemId: "unknown-item", quantity: 1, unit: "piece" }],
      inventoryItems
    )

    expect(result.ok).toBe(false)
  })

  it("rejects a zero or negative quantity", () => {
    expect(
      validateRecipeItems(
        [{ inventoryItemId: CUP, quantity: 0, unit: "piece" }],
        inventoryItems
      ).ok
    ).toBe(false)

    expect(
      validateRecipeItems(
        [{ inventoryItemId: CUP, quantity: -1, unit: "piece" }],
        inventoryItems
      ).ok
    ).toBe(false)
  })
})

describe("validateRecipeItems — duplicate ingredients", () => {
  it("rejects the same ingredient listed twice", () => {
    const result = validateRecipeItems(
      [
        { inventoryItemId: MILK, quantity: 100, unit: "ml" },
        { inventoryItemId: MILK, quantity: 50, unit: "ml" },
      ],
      inventoryItems
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/duplicate/i)
  })
})

describe("validateRecipeItems — recipe editing", () => {
  it("accepts a replacement ingredient list with different quantities", () => {
    const original = [{ inventoryItemId: MILK, quantity: 200, unit: "ml" as const }]
    const edited = [{ inventoryItemId: MILK, quantity: 250, unit: "ml" as const }]

    expect(validateRecipeItems(original, inventoryItems).ok).toBe(true)
    expect(validateRecipeItems(edited, inventoryItems).ok).toBe(true)
  })

  it("accepts adding a new ingredient during an edit", () => {
    const edited = [
      { inventoryItemId: MILK, quantity: 200, unit: "ml" as const },
      { inventoryItemId: CUP, quantity: 1, unit: "piece" as const },
    ]

    expect(validateRecipeItems(edited, inventoryItems).ok).toBe(true)
  })
})

describe("validateRecipeItems — recipe deletion", () => {
  it("treats an empty ingredient list as valid, representing a cleared recipe", () => {
    expect(validateRecipeItems([], inventoryItems).ok).toBe(true)
  })
})

describe("validateRecipeItems — unit consistency", () => {
  it("accepts a recipe unit from the same family as the ingredient's stocked unit", () => {
    // Coffee beans are stocked in kg; grams are still mass, so this is fine.
    const result = validateRecipeItems(
      [{ inventoryItemId: COFFEE_BEANS, quantity: 18, unit: "g" }],
      inventoryItems
    )

    expect(result.ok).toBe(true)
  })

  it("rejects a recipe unit from a different family than the ingredient's stocked unit", () => {
    // Cups are stocked as pieces; grams cannot describe a cup quantity.
    const result = validateRecipeItems(
      [{ inventoryItemId: CUP, quantity: 1, unit: "g" }],
      inventoryItems
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/not compatible/i)
  })
})
