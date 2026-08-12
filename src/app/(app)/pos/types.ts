export type HeldOrderSummary = {
  id: string
  subtotal: number
  total: number
  created_at: string
  order_items: {
    id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
  }[]
}
