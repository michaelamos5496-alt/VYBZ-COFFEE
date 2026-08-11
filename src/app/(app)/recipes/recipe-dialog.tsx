"use client"

import { useEffect, useState } from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Form, FormField, FormMessage } from "@/components/ui/form"
import type { InventoryItem, InventoryUnit, Product } from "@/types/database"
import { compatibleUnits } from "@/lib/inventory/units"
import { saveRecipe } from "./actions"
import type { RecipeWithItems } from "./types"

const ingredientSchema = z.object({
  inventory_item_id: z.string().min(1, "Select an ingredient"),
  quantity: z.number().positive("Must be greater than zero"),
  unit: z.string().min(1),
})

const recipeFormSchema = z
  .object({
    ingredients: z.array(ingredientSchema),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>()
    data.ingredients.forEach((ingredient, index) => {
      if (!ingredient.inventory_item_id) return
      if (seen.has(ingredient.inventory_item_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["ingredients", index, "inventory_item_id"],
          message: "This ingredient is already in the recipe",
        })
      }
      seen.add(ingredient.inventory_item_id)
    })
  })

type RecipeFormValues = z.infer<typeof recipeFormSchema>

function toDefaultValues(
  recipe: RecipeWithItems | null,
  inventoryItems: InventoryItem[]
): RecipeFormValues {
  if (recipe && recipe.recipe_items.length > 0) {
    return {
      ingredients: recipe.recipe_items.map((item) => ({
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
        unit: item.unit,
      })),
    }
  }

  const firstItem = inventoryItems[0]
  return {
    ingredients: firstItem
      ? [{ inventory_item_id: firstItem.id, quantity: 1, unit: firstItem.unit }]
      : [],
  }
}

function IngredientRow({
  control,
  index,
  onRemove,
  inventoryItems,
  usedIds,
  setUnit,
}: {
  control: ReturnType<typeof useForm<RecipeFormValues>>["control"]
  index: number
  onRemove: () => void
  inventoryItems: InventoryItem[]
  usedIds: Set<string>
  setUnit: (unit: InventoryUnit) => void
}) {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]))
  const selectedId = useWatch({
    control,
    name: `ingredients.${index}.inventory_item_id`,
  })
  const selectedItem = inventoryById.get(selectedId)
  const unitOptions = selectedItem ? compatibleUnits(selectedItem.unit) : []

  return (
    <TableRow>
      <TableCell>
        <FormField
          control={control}
          name={`ingredients.${index}.inventory_item_id`}
          render={({ field }) => (
            <div>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  const item = inventoryById.get(value ?? "")
                  if (item) setUnit(item.unit)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems
                    .filter((item) => item.id === selectedId || !usedIds.has(item.id))
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </div>
          )}
        />
      </TableCell>
      <TableCell>
        <FormField
          control={control}
          name={`ingredients.${index}.quantity`}
          render={({ field }) => (
            <div>
              <Input
                type="number"
                step="0.01"
                min="0"
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                value={field.value}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
              />
              <FormMessage />
            </div>
          )}
        />
      </TableCell>
      <TableCell>
        <FormField
          control={control}
          name={`ingredients.${index}.unit`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function RecipeDialog({
  open,
  onOpenChange,
  product,
  recipe,
  inventoryItems,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  recipe: RecipeWithItems | null
  inventoryItems: InventoryItem[]
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: toDefaultValues(recipe, inventoryItems),
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  })

  const watchedIngredients = useWatch({
    control: form.control,
    name: "ingredients",
  })

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(recipe, inventoryItems))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe, product?.id])

  function usedIdsExcept(index: number) {
    return new Set(
      (watchedIngredients ?? [])
        .filter((_, i) => i !== index)
        .map((ingredient) => ingredient.inventory_item_id)
        .filter(Boolean)
    )
  }

  function addIngredient() {
    const used = usedIdsExcept(-1)
    const nextItem = inventoryItems.find((item) => !used.has(item.id))
    append({
      inventory_item_id: nextItem?.id ?? "",
      quantity: 1,
      unit: nextItem?.unit ?? "piece",
    })
  }

  async function onSubmit(values: RecipeFormValues) {
    if (!product) return
    setIsSaving(true)

    const result = await saveRecipe(
      product.id,
      values.ingredients.map((ingredient) => ({
        inventoryItemId: ingredient.inventory_item_id,
        quantity: ingredient.quantity,
        unit: ingredient.unit as InventoryUnit,
      }))
    )

    setIsSaving(false)

    if (result.error) {
      toast.error("Could not save recipe", { description: result.error })
      return
    }

    toast.success("Recipe saved")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Recipe: {product?.name}</DialogTitle>
          <DialogDescription>
            List the ingredients this product consumes when it&apos;s sold.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="w-28">Quantity</TableHead>
                    <TableHead className="w-28">Unit</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground text-center text-sm"
                      >
                        No ingredients yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => (
                      <IngredientRow
                        key={field.id}
                        control={form.control}
                        index={index}
                        onRemove={() => remove(index)}
                        inventoryItems={inventoryItems}
                        usedIds={usedIdsExcept(index)}
                        setUnit={(unit) =>
                          form.setValue(`ingredients.${index}.unit`, unit)
                        }
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={fields.length >= inventoryItems.length}
              onClick={addIngredient}
            >
              <Plus />
              Add Ingredient
            </Button>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                Save Recipe
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
