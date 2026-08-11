"use client"

import { useState, useTransition } from "react"
import { ArrowDown, ArrowUp, Pencil, Plus, Tag } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { EmptyState } from "@/components/layout/empty-state"
import type { Category } from "@/types/database"
import { setCategoryActive, reorderCategory } from "./categories-actions"
import { CategoryDialog } from "./category-dialog"

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const orderedIds = categories.map((category) => category.id)

  function openCreate() {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  function handleToggleActive(category: Category, active: boolean) {
    startTransition(async () => {
      const result = await setCategoryActive(category.id, active)
      if (result.error) {
        toast.error("Could not update category", { description: result.error })
        return
      }
      router.refresh()
    })
  }

  function handleReorder(category: Category, direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderCategory(category.id, direction, orderedIds)
      if (result.error) {
        toast.error("Could not reorder category", { description: result.error })
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Organize your menu into groups like Coffee, Tea, or Pastries.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Create categories to organize your menu, like Coffee, Tea, or Pastries."
          actionLabel="Add Category"
          onAction={openCreate}
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-3"
            >
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPending || index === 0}
                  onClick={() => handleReorder(category, "up")}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPending || index === categories.length - 1}
                  onClick={() => handleReorder(category, "down")}
                >
                  <ArrowDown />
                </Button>
              </div>

              <div className="flex-1">
                <p className="font-medium">{category.name}</p>
                {category.description ? (
                  <p className="text-muted-foreground text-sm">
                    {category.description}
                  </p>
                ) : null}
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openEdit(category)}
              >
                <Pencil />
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  {category.active ? "Active" : "Inactive"}
                </span>
                <Switch
                  checked={category.active}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    handleToggleActive(category, checked)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
      />
    </div>
  )
}
