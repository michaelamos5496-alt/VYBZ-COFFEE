"use client"

import { useMemo, useState, useTransition } from "react"
import { MoreHorizontal, Package, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmptyState } from "@/components/layout/empty-state"
import { useCurrentRole } from "@/lib/auth/role-context"
import { canManageProducts } from "@/lib/auth/permissions"
import type { Category, Product } from "@/types/database"
import { deleteProduct, setProductActive } from "./actions"
import { ProductDialog } from "./product-dialog"
import { CategoriesManager } from "./categories-manager"

const ALL_CATEGORIES = "all"
const NO_CATEGORY = "none"

export function ProductsView({
  products,
  categories,
}: {
  products: Product[]
  categories: Category[]
}) {
  const router = useRouter()
  const role = useCurrentRole()
  const canManage = canManageProducts(role)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  )

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        search.trim() === "" ||
        product.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (product.sku ?? "").toLowerCase().includes(search.trim().toLowerCase())

      const matchesCategory =
        categoryFilter === ALL_CATEGORIES ||
        (categoryFilter === NO_CATEGORY && !product.category_id) ||
        product.category_id === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [products, search, categoryFilter])

  function openCreate() {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  function handleToggleActive(product: Product, active: boolean) {
    startTransition(async () => {
      const result = await setProductActive(product.id, active)
      if (result.error) {
        toast.error("Could not update product", { description: result.error })
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!deletingProduct) return
    const product = deletingProduct
    startTransition(async () => {
      const result = await deleteProduct(product.id)
      if (result.error) {
        toast.error("Could not delete product", { description: result.error })
        return
      }
      toast.success("Product deleted")
      setDeletingProduct(null)
      router.refresh()
    })
  }

  return (
    <Tabs defaultValue="products" className="flex flex-1 flex-col gap-4">
      <TabsList>
        <TabsTrigger value="products">Products</TabsTrigger>
        {canManage && <TabsTrigger value="categories">Categories</TabsTrigger>}
      </TabsList>

      <TabsContent value="products" className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search products…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value ?? ALL_CATEGORIES)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus />
              New Product
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first menu item, like a Cappuccino or Iced Latte, to start building your menu."
            actionLabel={canManage ? "Add Product" : undefined}
            onAction={canManage ? openCreate : undefined}
          />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching products"
            description="Try a different search term or category filter."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category_id
                        ? (categoryById.get(product.category_id)?.name ?? "—")
                        : "—"}
                    </TableCell>
                    <TableCell>{product.sku ?? "—"}</TableCell>
                    <TableCell>
                      GH₵{Number(product.selling_price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canManage ? (
                          <Switch
                            checked={product.active}
                            disabled={isPending}
                            onCheckedChange={(checked) =>
                              handleToggleActive(product, checked)
                            }
                          />
                        ) : null}
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-9 sm:size-7"
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(product)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeletingProduct(product)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="categories">
        <CategoriesManager categories={categories} />
      </TabsContent>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        categories={categories}
      />

      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingProduct?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product and its recipe from your menu. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  )
}
