"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { InventoryItem, InventoryUnit } from "@/types/database"
import {
  createInventoryItem,
  updateInventoryItem,
  type InventoryItemInput,
} from "./actions"

const UNITS: InventoryUnit[] = [
  "g",
  "kg",
  "ml",
  "litre",
  "piece",
  "pack",
  "bottle",
]

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  unit: z.enum(UNITS as [InventoryUnit, ...InventoryUnit[]]),
  minimum_quantity: z.number().min(0, "Cannot be negative"),
  cost_per_unit: z.number().min(0, "Cannot be negative"),
  opening_quantity: z.number().min(0, "Cannot be negative").optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

function toDefaultValues(item: InventoryItem | null): ItemFormValues {
  return {
    name: item?.name ?? "",
    sku: item?.sku ?? "",
    unit: item?.unit ?? "piece",
    minimum_quantity: item?.minimum_quantity ?? 0,
    cost_per_unit: item?.cost_per_unit ?? 0,
    opening_quantity: 0,
  }
}

export function ItemDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const isEdit = !!item

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: toDefaultValues(item),
  })

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(item))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  async function onSubmit(values: ItemFormValues) {
    setIsSaving(true)

    const input: InventoryItemInput = {
      name: values.name,
      sku: values.sku || null,
      unit: values.unit,
      minimum_quantity: values.minimum_quantity,
      cost_per_unit: values.cost_per_unit,
    }

    const result = isEdit
      ? await updateInventoryItem(item.id, input)
      : await createInventoryItem(input, values.opening_quantity ?? 0)

    setIsSaving(false)

    if (result.error) {
      toast.error("Could not save inventory item", {
        description: result.error,
      })
      return
    }

    toast.success(isEdit ? "Inventory item updated" : "Inventory item created")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Inventory Item" : "New Inventory Item"}
          </DialogTitle>
          {!isEdit && (
            <DialogDescription>
              An ingredient or material you track stock for, like Coffee
              Beans or Milk.
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Coffee Beans" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minimum_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Level</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per Unit (GH₵)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit && (
              <FormField
                control={form.control}
                name="opening_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Stock Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                {isEdit ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
