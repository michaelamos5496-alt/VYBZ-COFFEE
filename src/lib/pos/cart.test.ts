import { describe, expect, it } from "vitest"

import {
  addToCart,
  cartItemCount,
  cartSubtotal,
  cartToSaleItems,
  clearCart,
  decrementQuantity,
  heldOrderToCart,
  incrementQuantity,
  removeFromCart,
  setQuantity,
  type CartItem,
  type CartProduct,
} from "./cart"

const CAPPUCCINO: CartProduct = {
  id: "product-cappuccino",
  name: "Cappuccino",
  selling_price: 35,
  image_url: null,
}

const LATTE: CartProduct = {
  id: "product-latte",
  name: "Latte",
  selling_price: 38,
  image_url: null,
}

describe("addToCart — adding products", () => {
  it("adds a new product as a line with quantity 1", () => {
    const cart = addToCart([], CAPPUCCINO)
    expect(cart).toEqual([
      {
        productId: "product-cappuccino",
        name: "Cappuccino",
        unitPrice: 35,
        quantity: 1,
        imageUrl: null,
      },
    ])
  })

  it("increments quantity when the same product is added again", () => {
    let cart: CartItem[] = []
    cart = addToCart(cart, CAPPUCCINO)
    cart = addToCart(cart, CAPPUCCINO)
    cart = addToCart(cart, CAPPUCCINO)

    expect(cart).toHaveLength(1)
    expect(cart[0].quantity).toBe(3)
  })

  it("keeps separate products as separate lines", () => {
    let cart: CartItem[] = []
    cart = addToCart(cart, CAPPUCCINO)
    cart = addToCart(cart, LATTE)

    expect(cart).toHaveLength(2)
  })
})

describe("quantity changes", () => {
  it("increments and decrements a line's quantity", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = incrementQuantity(cart, CAPPUCCINO.id)
    expect(cart[0].quantity).toBe(2)

    cart = decrementQuantity(cart, CAPPUCCINO.id)
    expect(cart[0].quantity).toBe(1)
  })

  it("removes the line when decrementing to zero", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = decrementQuantity(cart, CAPPUCCINO.id)
    expect(cart).toEqual([])
  })

  it("setQuantity removes the line for zero or negative input", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = setQuantity(cart, CAPPUCCINO.id, 0)
    expect(cart).toEqual([])

    cart = addToCart([], CAPPUCCINO)
    cart = setQuantity(cart, CAPPUCCINO.id, -5)
    expect(cart).toEqual([])
  })

  it("setQuantity sets an exact quantity", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = setQuantity(cart, CAPPUCCINO.id, 7)
    expect(cart[0].quantity).toBe(7)
  })

  it("is a no-op when changing quantity for a product not in the cart", () => {
    const cart = addToCart([], CAPPUCCINO)
    expect(incrementQuantity(cart, "nonexistent")).toEqual(cart)
    expect(decrementQuantity(cart, "nonexistent")).toEqual(cart)
  })
})

describe("removeFromCart", () => {
  it("removes a line entirely regardless of quantity", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = addToCart(cart, CAPPUCCINO)
    cart = removeFromCart(cart, CAPPUCCINO.id)
    expect(cart).toEqual([])
  })

  it("leaves other lines untouched", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = addToCart(cart, LATTE)
    cart = removeFromCart(cart, CAPPUCCINO.id)
    expect(cart).toEqual([
      {
        productId: "product-latte",
        name: "Latte",
        unitPrice: 38,
        quantity: 1,
        imageUrl: null,
      },
    ])
  })
})

describe("clearCart", () => {
  it("returns an empty cart", () => {
    expect(clearCart()).toEqual([])
  })
})

describe("cart calculations", () => {
  it("computes subtotal across multiple lines and quantities", () => {
    let cart = addToCart([], CAPPUCCINO) // 35
    cart = addToCart(cart, CAPPUCCINO) // 35 * 2 = 70
    cart = addToCart(cart, LATTE) // 38

    expect(cartSubtotal(cart)).toBe(108)
  })

  it("returns zero subtotal for an empty cart", () => {
    expect(cartSubtotal([])).toBe(0)
  })

  it("counts total items across lines, not line count", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = addToCart(cart, CAPPUCCINO)
    cart = addToCart(cart, LATTE)

    expect(cartItemCount(cart)).toBe(3)
  })
})

describe("cartToSaleItems", () => {
  it("shapes the cart into product_id/quantity pairs for the checkout RPCs", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = addToCart(cart, CAPPUCCINO)
    cart = addToCart(cart, LATTE)

    expect(cartToSaleItems(cart)).toEqual([
      { product_id: "product-cappuccino", quantity: 2 },
      { product_id: "product-latte", quantity: 1 },
    ])
  })

  it("returns an empty array for an empty cart", () => {
    expect(cartToSaleItems([])).toEqual([])
  })
})

describe("heldOrderToCart — hold and retrieve", () => {
  it("rebuilds cart lines from a held order's saved items", () => {
    const cart = heldOrderToCart([
      {
        product_id: "product-cappuccino",
        product_name: "Cappuccino",
        quantity: 2,
        unit_price: 35,
      },
      {
        product_id: "product-latte",
        product_name: "Latte",
        quantity: 1,
        unit_price: 38,
      },
    ])

    expect(cart).toEqual([
      {
        productId: "product-cappuccino",
        name: "Cappuccino",
        unitPrice: 35,
        quantity: 2,
        imageUrl: null,
      },
      {
        productId: "product-latte",
        name: "Latte",
        unitPrice: 38,
        quantity: 1,
        imageUrl: null,
      },
    ])
  })

  it("coerces numeric-string quantities and prices from the database", () => {
    const cart = heldOrderToCart([
      {
        product_id: "product-cappuccino",
        product_name: "Cappuccino",
        // Postgres numeric columns often arrive as strings over the wire
        quantity: "3" as unknown as number,
        unit_price: "35.00" as unknown as number,
      },
    ])

    expect(cart[0].quantity).toBe(3)
    expect(cart[0].unitPrice).toBe(35)
  })

  it("round-trips: holding then retrieving restores the same cart shape", () => {
    let cart = addToCart([], CAPPUCCINO)
    cart = addToCart(cart, LATTE)

    const heldLines = cart.map((item) => ({
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }))

    expect(heldOrderToCart(heldLines)).toEqual(cart)
  })
})
