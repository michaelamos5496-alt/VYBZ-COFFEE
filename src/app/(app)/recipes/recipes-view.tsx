"use client"

import { useMemo, useState, useTransition } from "react"
import { ClipboardList, MoreHorizontal, Search } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import type { InventoryItem, Product } from "@/types/database"
import { deleteRecipe } from "./actions"
import { RecipeDialog } from "./recipe-dialog"
import type { RecipeWithItems } from "./types"

export function RecipesView({
  products,
  inventoryItems,
  recipes,
}: {
  products: Product[]
  inventoryItems: InventoryItem[]
  recipes: RecipeWithItems[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingRecipe, setDeletingRecipe] = useState<{
    id: string
    productName: string
  } | null>(null)

  const recipeByProductId = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.product_id, recipe])),
    [recipes]
  )

  const filteredProducts = useMemo(() => {
    if (search.trim() === "") return products
    const term = search.trim().toLowerCase()
    return products.filter((product) => product.name.toLowerCase().includes(term))
  }, [products, search])

  function openRecipe(product: Product) {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  function handleDeleteRecipe() {
    if (!deletingRecipe) return
    const { id } = deletingRecipe
    startTransition(async () => {
      const result = await deleteRecipe(id)
      if (result.error) {
        toast.error("Could not delete recipe", { description: result.error })
        return
      }
      toast.success("Recipe deleted")
      setDeletingRecipe(null)
      router.refresh()
    })
  }

  const activeRecipe = editingProduct
    ? (recipeByProductId.get(editingProduct.id) ?? null)
    : null

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative max-w-xs">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search products…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No products yet"
          description="Add products first, then come back here to define what each one consumes."
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching products"
          description="Try a different search term."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Recipe</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const recipe = recipeByProductId.get(product.id)
                const count = recipe?.recipe_items.length ?? 0

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {count > 0 ? (
                        <Badge variant="default">
                          {count} ingredient{count === 1 ? "" : "s"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No recipe</Badge>
                      )}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => openRecipe(product)}>
                            {count > 0 ? "Edit Recipe" : "Create Recipe"}
                          </DropdownMenuItem>
                          {recipe && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                setDeletingRecipe({
                                  id: recipe.id,
                                  productName: product.name,
                                })
                              }
                            >
                              Delete Recipe
                            </DropdownMenuItem>
                          )}
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

      <RecipeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        recipe={activeRecipe}
        inventoryItems={inventoryItems}
      />

      <AlertDialog
        open={!!deletingRecipe}
        onOpenChange={(open) => !open && setDeletingRecipe(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete recipe for {deletingRecipe?.productName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes all ingredients from this recipe. This can&apos;t
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteRecipe}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
