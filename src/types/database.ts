export type StaffRole = "admin" | "manager" | "cashier"

export type InventoryUnit =
  | "g"
  | "kg"
  | "ml"
  | "litre"
  | "piece"
  | "pack"
  | "bottle"

export type StockMovementType =
  | "purchase"
  | "sale"
  | "adjustment"
  | "waste"
  | "return"
  | "opening_stock"

export type Staff = {
  id: string
  name: string
  email: string
  role: StaffRole
  active: boolean
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  name: string
  description: string | null
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  sku: string | null
  selling_price: number
  image_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type InventoryItem = {
  id: string
  name: string
  sku: string | null
  unit: InventoryUnit
  current_quantity: number
  minimum_quantity: number
  cost_per_unit: number
  active: boolean
  created_at: string
  updated_at: string
}

export type Recipe = {
  id: string
  product_id: string
  created_at: string
  updated_at: string
}

export type RecipeItem = {
  id: string
  recipe_id: string
  inventory_item_id: string
  quantity: number
  unit: InventoryUnit
}

export type StockMovement = {
  id: string
  inventory_item_id: string
  movement_type: StockMovementType
  quantity: number
  previous_quantity: number
  new_quantity: number
  reference_type: string | null
  reference_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export type OrderStatus = "held" | "completed"
export type OrderPaymentStatus = "pending" | "paid" | "failed"
export type PaymentMethod = "cash" | "card" | "mobile_money"

export type Order = {
  id: string
  order_number: number | null
  subtotal: number
  discount: number
  tax: number
  total: number
  payment_method: PaymentMethod | null
  payment_status: OrderPaymentStatus
  amount_received: number | null
  change_due: number | null
  status: OrderStatus
  cashier_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export type BusinessSettings = {
  id: string
  business_name: string
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  currency: string
  receipt_footer: string | null
  tax_rate: number
  tax_inclusive: boolean
  payment_methods: string[]
  created_at: string
  updated_at: string
}

export type SaveRecipeItemInput = {
  inventory_item_id: string
  quantity: number
  unit: InventoryUnit
}

export type ProcessSaleItemInput = {
  product_id: string
  quantity: number
}

export type CheckoutResult = {
  order_id: string
  order_number: number
  total: number
  change_due: number
}

export type StockStatus = "out_of_stock" | "low_stock" | "normal"

export type InventoryReportRow = InventoryItem & {
  stock_status: StockStatus
}

export type DashboardStats = {
  total_sales: number
  order_count: number
  average_order_value: number
}

export type SalesByDayRow = {
  day: string
  revenue: number
  order_count: number
}

export type SalesByHourRow = {
  hour: number
  revenue: number
  order_count: number
}

export type PaymentBreakdownRow = {
  payment_method: PaymentMethod
  transaction_count: number
  total_value: number
}

export type ProductPerformanceRow = {
  product_id: string
  product_name: string
  units_sold: number
  revenue: number
  percentage_of_sales: number
  total_count: number
}

export type OrderSearchRow = {
  id: string
  order_number: number | null
  completed_at: string | null
  cashier_name: string | null
  total: number
  payment_method: PaymentMethod | null
  status: OrderStatus
  payment_status: OrderPaymentStatus
  total_count: number
}

export type Database = {
  public: {
    Tables: {
      staff: {
        Row: Staff
        Insert: Partial<Staff> & { name: string; email: string }
        Update: Partial<Staff>
        Relationships: []
      }
      categories: {
        Row: Category
        Insert: Partial<Category> & { name: string }
        Update: Partial<Category>
        Relationships: []
      }
      products: {
        Row: Product
        Insert: Partial<Product> & { name: string; selling_price: number }
        Update: Partial<Product>
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: InventoryItem
        Insert: Partial<InventoryItem> & { name: string; unit: InventoryUnit }
        Update: Partial<InventoryItem>
        Relationships: []
      }
      recipes: {
        Row: Recipe
        Insert: Partial<Recipe> & { product_id: string }
        Update: Partial<Recipe>
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: RecipeItem
        Insert: Partial<RecipeItem> & {
          recipe_id: string
          inventory_item_id: string
          quantity: number
          unit: InventoryUnit
        }
        Update: Partial<RecipeItem>
        Relationships: [
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: StockMovement
        Insert: Partial<StockMovement> & {
          inventory_item_id: string
          movement_type: StockMovementType
          quantity: number
        }
        Update: Partial<StockMovement>
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: BusinessSettings
        Insert: Partial<BusinessSettings>
        Update: Partial<BusinessSettings>
        Relationships: []
      }
      orders: {
        Row: Order
        Insert: Partial<Order>
        Update: Partial<Order>
        Relationships: [
          {
            foreignKeyName: "orders_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: OrderItem
        Insert: Partial<OrderItem> & {
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          line_total: number
        }
        Update: Partial<OrderItem>
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_report: {
        Row: InventoryReportRow
        Relationships: []
      }
    }
    Functions: {
      save_recipe: {
        Args: { p_product_id: string; p_items: SaveRecipeItemInput[] }
        Returns: string
      }
      process_sale: {
        Args: {
          p_order_id: string
          p_items: ProcessSaleItemInput[]
          p_created_by: string | null
        }
        Returns: undefined
      }
      hold_order: {
        Args: { p_items: ProcessSaleItemInput[]; p_cashier_id: string | null }
        Returns: string
      }
      checkout_order: {
        Args: {
          p_items: ProcessSaleItemInput[]
          p_discount: number
          p_payment_method: PaymentMethod
          p_amount_received: number | null
          p_cashier_id: string | null
        }
        Returns: CheckoutResult[]
      }
      dashboard_stats: {
        Args: { p_start: string; p_end: string }
        Returns: DashboardStats[]
      }
      sales_by_day: {
        Args: { p_days: number }
        Returns: SalesByDayRow[]
      }
      sales_by_hour_today: {
        Args: Record<string, never>
        Returns: SalesByHourRow[]
      }
      payment_breakdown: {
        Args: { p_start: string; p_end: string }
        Returns: PaymentBreakdownRow[]
      }
      product_performance: {
        Args: {
          p_start: string | null
          p_end: string | null
          p_limit: number
          p_offset: number
        }
        Returns: ProductPerformanceRow[]
      }
      search_orders: {
        Args: {
          p_start: string | null
          p_end: string | null
          p_cashier_id: string | null
          p_payment_method: PaymentMethod | null
          p_product_id: string | null
          p_category_id: string | null
          p_limit: number
          p_offset: number
        }
        Returns: OrderSearchRow[]
      }
    }
    Enums: {
      staff_role: StaffRole
      inventory_unit: InventoryUnit
      stock_movement_type: StockMovementType
      order_status: OrderStatus
      order_payment_status: OrderPaymentStatus
      order_payment_method: PaymentMethod
    }
    CompositeTypes: Record<string, never>
  }
}
