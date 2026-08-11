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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      staff_role: StaffRole
      inventory_unit: InventoryUnit
      stock_movement_type: StockMovementType
    }
    CompositeTypes: Record<string, never>
  }
}
