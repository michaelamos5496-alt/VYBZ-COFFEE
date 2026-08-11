"use client"

import { useMemo, useState, useTransition } from "react"
import {
  AlertTriangle,
  Boxes,
  MoreHorizontal,
  Plus,
  Search,
  TruckIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/layout/empty-state"
import type { InventoryItem } from "@/types/database"
import { setInventoryItemActive } from "./actions"
import { ItemDialog } from "./item-dialog"
import { ReceiveStockDialog } from "./receive-stock-dialog"
import { AdjustStockDialog } from "./adjust-stock-dialog"
import { MovementHistory, type MovementWithDetails } from "./movement-history"

export function InventoryView({
  items,
  movements,
}: {
  items: InventoryItem[]
  movements: MovementWithDetails[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [receiveItemId, setReceiveItemId] = useState<string | undefined>()

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustItemId, setAdjustItemId] = useState<string | undefined>()

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        search.trim() === "" ||
        item.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (item.sku ?? "").toLowerCase().includes(search.trim().toLowerCase())

      const isLow = Number(item.current_quantity) <= Number(item.minimum_quantity)
      const matchesLowStock = !lowStockOnly || isLow

      return matchesSearch && matchesLowStock
    })
  }, [items, search, lowStockOnly])

  function openCreateItem() {
    setEditingItem(null)
    setItemDialogOpen(true)
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item)
    setItemDialogOpen(true)
  }

  function openReceive(itemId?: string) {
    setReceiveItemId(itemId)
    setReceiveDialogOpen(true)
  }

  function openAdjust(itemId?: string) {
    setAdjustItemId(itemId)
    setAdjustDialogOpen(true)
  }

  function handleToggleActive(item: InventoryItem, active: boolean) {
    startTransition(async () => {
      const result = await setInventoryItemActive(item.id, active)
      if (result.error) {
        toast.error("Could not update item", { description: result.error })
        return
      }
      router.refresh()
    })
  }

  return (
    <Tabs defaultValue="inventory" className="flex flex-1 flex-col gap-4">
      <TabsList>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="inventory" className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search ingredients…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="low-stock-only"
                checked={lowStockOnly}
                onCheckedChange={setLowStockOnly}
              />
              <Label htmlFor="low-stock-only" className="text-sm">
                Low stock only
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openReceive()}>
              <TruckIcon />
              Receive Stock
            </Button>
            <Button size="sm" onClick={openCreateItem}>
              <Plus />
              New Item
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory items yet"
            description="Add ingredients like Coffee Beans, Milk, or Cups so you can track stock and build recipes."
            actionLabel="Add Inventory Item"
            onAction={openCreateItem}
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching items"
            description="Try a different search term or turn off the low stock filter."
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
                  <TableHead>Cost / Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const low =
                    Number(item.current_quantity) <=
                    Number(item.minimum_quantity)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.current_quantity}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.minimum_quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        GH₵{Number(item.cost_per_unit).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {low && (
                            <Badge variant="destructive">
                              <AlertTriangle />
                              Low Stock
                            </Badge>
                          )}
                          <Badge variant={item.active ? "default" : "secondary"}>
                            {item.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openReceive(item.id)}
                            >
                              Receive Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openAdjust(item.id)}
                            >
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditItem(item)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isPending}
                              onClick={() =>
                                handleToggleActive(item, !item.active)
                              }
                            >
                              {item.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        <MovementHistory movements={movements} />
      </TabsContent>

      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
      />

      <ReceiveStockDialog
        open={receiveDialogOpen}
        onOpenChange={setReceiveDialogOpen}
        items={items}
        defaultItemId={receiveItemId}
      />

      <AdjustStockDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        items={items}
        defaultItemId={adjustItemId}
      />
    </Tabs>
  )
}
