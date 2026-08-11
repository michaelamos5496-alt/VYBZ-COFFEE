import { Boxes, Plus } from "lucide-react"

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

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name")

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Inventory" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Raw ingredients and materials used to make your products.
          </p>
          <Button size="sm">
            <Plus />
            New Item
          </Button>
        </div>

        {!items || items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory items yet"
            description="Add ingredients like Coffee Beans, Milk, or Cups so you can track stock and build recipes."
            actionLabel="Add Inventory Item"
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Minimum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const low = Number(item.current_quantity) <= Number(item.minimum_quantity)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.current_quantity}</TableCell>
                      <TableCell>{item.minimum_quantity}</TableCell>
                      <TableCell>
                        <Badge variant={low ? "destructive" : "default"}>
                          {low ? "Low Stock" : "In Stock"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
