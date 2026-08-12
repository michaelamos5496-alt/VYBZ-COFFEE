import { describe, expect, it } from "vitest"

import { toFriendlyError } from "./errors"

describe("toFriendlyError — raw constraint violations", () => {
  it("rewrites a SKU duplicate-key violation", () => {
    const message = toFriendlyError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "products_sku_key"',
    })
    expect(message).toBe("That SKU is already in use.")
  })

  it("rewrites an email duplicate-key violation", () => {
    const message = toFriendlyError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "staff_email_key"',
    })
    expect(message).toBe("That email is already in use.")
  })

  it("falls back to a generic duplicate message for an unrecognized constraint", () => {
    const message = toFriendlyError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "some_other_key"',
    })
    expect(message).toBe("This already exists.")
  })

  it("rewrites a foreign-key violation referencing order_items", () => {
    const message = toFriendlyError({
      code: "23503",
      message:
        'update or delete on table "products" violates foreign key constraint "order_items_product_id_fkey" on table "order_items"',
    })
    expect(message).toBe("This can't be removed because it's part of a past order.")
  })

  it("falls back to a generic foreign-key message for an unrecognized reference", () => {
    const message = toFriendlyError({
      code: "23503",
      message: "violates foreign key constraint on some other table",
    })
    expect(message).toBe("This is being used elsewhere and can't be removed.")
  })

  it("rewrites a not-null violation", () => {
    expect(toFriendlyError({ code: "23502", message: 'null value in column "name"' })).toBe(
      "A required field is missing."
    )
  })

  it("rewrites a check constraint violation", () => {
    expect(
      toFriendlyError({ code: "23514", message: "new row violates check constraint" })
    ).toBe("That value isn't allowed.")
  })

  it("rewrites an insufficient-privilege error", () => {
    expect(
      toFriendlyError({ code: "42501", message: "permission denied for table orders" })
    ).toBe("You don't have permission to do that.")
  })
})

describe("toFriendlyError — application messages pass through unchanged", () => {
  it("leaves a custom raise exception message (P0001) untouched", () => {
    const message = toFriendlyError({
      code: "P0001",
      message: "Insufficient stock for Milk: need 600ml, have 400ml",
    })
    expect(message).toBe("Insufficient stock for Milk: need 600ml, have 400ml")
  })

  it("leaves a message untouched when no code is present", () => {
    const message = toFriendlyError({ message: "Cart is empty" })
    expect(message).toBe("Cart is empty")
  })
})
