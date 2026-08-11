"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import type { InventoryItem } from "@/types/database"
import { receiveStock } from "./actions"

const receiveSchema = z.object({
  inventory_item_id: z.string().min(1, "Select an item"),
  quantity: z.number().positive("Enter a quantity greater than zero"),
  cost_per_unit: z.number().min(0).optional(),
  note: z.string().optional(),
})

type ReceiveFormValues = z.infer<typeof receiveSchema>

export function ReceiveStockDialog({
  open,
  onOpenChange,
  items,
  defaultItemId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: InventoryItem[]
  defaultItemId?: string
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      inventory_item_id: defaultItemId ?? "",
      quantity: 0,
      cost_per_unit: undefined,
      note: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        inventory_item_id: defaultItemId ?? "",
        quantity: 0,
        cost_per_unit: undefined,
        note: "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultItemId])

  const selectedItemId = useWatch({
    control: form.control,
    name: "inventory_item_id",
  })
  const selectedItem = items.find((item) => item.id === selectedItemId)

  async function onSubmit(values: ReceiveFormValues) {
    setIsSaving(true)

    const result = await receiveStock({
      inventory_item_id: values.inventory_item_id,
      quantity: values.quantity,
      cost_per_unit: values.cost_per_unit ?? null,
      note: values.note || null,
    })

    setIsSaving(false)

    if (result.error) {
      toast.error("Could not receive stock", { description: result.error })
      return
    }

    toast.success("Stock received")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Stock</DialogTitle>
          <DialogDescription>
            Record ingredients that just arrived. This updates the quantity
            on hand and logs a stock movement.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="inventory_item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantity Received{" "}
                      {selectedItem ? `(${selectedItem.unit})` : ""}
                    </FormLabel>
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
                        placeholder="Optional"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : e.target.valueAsNumber
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional, e.g. supplier or invoice #" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                Receive Stock
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
