export type CartItem = {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  imageUrl: string | null
}

export type CartProduct = {
  id: string
  name: string
  selling_price: number
  image_url: string | null
}

/** Adds a product, or increments its quantity if it's already in the cart. */
export function addToCart(cart: CartItem[], product: CartProduct): CartItem[] {
  const existing = cart.find((item) => item.productId === product.id)

  if (existing) {
    return cart.map((item) =>
      item.productId === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    )
  }

  return [
    ...cart,
    {
      productId: product.id,
      name: product.name,
      unitPrice: product.selling_price,
      quantity: 1,
      imageUrl: product.image_url,
    },
  ]
}

/** Sets a line's quantity directly. Removes the line if quantity drops to zero or below. */
export function setQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return removeFromCart(cart, productId)
  }

  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity } : item
  )
}

export function incrementQuantity(cart: CartItem[], productId: string): CartItem[] {
  const item = cart.find((i) => i.productId === productId)
  if (!item) return cart
  return setQuantity(cart, productId, item.quantity + 1)
}

export function decrementQuantity(cart: CartItem[], productId: string): CartItem[] {
  const item = cart.find((i) => i.productId === productId)
  if (!item) return cart
  return setQuantity(cart, productId, item.quantity - 1)
}

export function removeFromCart(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.productId !== productId)
}

export function clearCart(): CartItem[] {
  return []
}

export function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}

export function cartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0)
}

export type SaleItemInput = { product_id: string; quantity: number }

/** Shapes the cart into the {product_id, quantity} payload the hold_order/checkout_order RPCs expect. */
export function cartToSaleItems(cart: CartItem[]): SaleItemInput[] {
  return cart.map((item) => ({ product_id: item.productId, quantity: item.quantity }))
}

export type HeldOrderLine = {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
}

/** Rebuilds a cart from a held order's saved line items, e.g. when a cashier retrieves it. */
export function heldOrderToCart(items: HeldOrderLine[]): CartItem[] {
  return items.map((item) => ({
    productId: item.product_id,
    name: item.product_name,
    unitPrice: Number(item.unit_price),
    quantity: Number(item.quantity),
    imageUrl: null,
  }))
}
