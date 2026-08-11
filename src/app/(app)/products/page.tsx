import { Package, Plus } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("name")

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Products" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Sellable menu items available at checkout.
          </p>
          <Button size="sm">
            <Plus />
            New Product
          </Button>
        </div>

        {!products || products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first menu item, like a Cappuccino or Iced Latte, to start building your menu."
            actionLabel="Add Product"
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>{product.sku ?? "—"}</TableCell>
                    <TableCell>
                      GH₵{Number(product.selling_price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
