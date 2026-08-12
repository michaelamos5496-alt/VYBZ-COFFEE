import type { PaymentMethod } from "@/types/database"

export type SalesReportFilters = {
  from: string | null
  to: string | null
  cashierId: string | null
  paymentMethod: PaymentMethod | null
  productId: string | null
  categoryId: string | null
  page: number
}
