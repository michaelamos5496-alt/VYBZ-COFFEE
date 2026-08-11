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
import { adjustStock, type AdjustmentReason } from "./actions"

const REASONS: { value: AdjustmentReason; label: string }[] = [
  { value: "count_correction", label: "Physical count correction" },
  { value: "damaged", label: "Damaged stock" },
  { value: "waste", label: "Waste" },
  { value: "missing", label: "Missing stock" },
]

const adjustSchema = z.object({
  inventory_item_id: z.string().min(1, "Select an item"),
  reason: z.enum([
    "count_correction",
    "damaged",
    "waste",
    "missing",
  ] as [AdjustmentReason, ...AdjustmentReason[]]),
  amount: z.number().min(0, "Cannot be negative"),
  note: z.string().min(1, "A reason note is required"),
})

type AdjustFormValues = z.infer<typeof adjustSchema>

export function AdjustStockDialog({
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

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      inventory_item_id: defaultItemId ?? "",
      reason: "count_correction",
      amount: 0,
      note: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        inventory_item_id: defaultItemId ?? "",
        reason: "count_correction",
        amount: 0,
        note: "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultItemId])

  const selectedItemId = useWatch({
    control: form.control,
    name: "inventory_item_id",
  })
  const reason = useWatch({ control: form.control, name: "reason" })
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const isCorrection = reason === "count_correction"

  async function onSubmit(values: AdjustFormValues) {
    setIsSaving(true)

    const result = await adjustStock(
      isCorrection
        ? {
            inventory_item_id: values.inventory_item_id,
            reason: values.reason,
            note: values.note,
            mode: "set",
            target_quantity: values.amount,
          }
        : {
            inventory_item_id: values.inventory_item_id,
            reason: values.reason,
            note: values.note,
            mode: "delta",
            amount: values.amount,
          }
    )

    setIsSaving(false)

    if (result.error) {
      toast.error("Could not adjust stock", { description: result.error })
      return
    }

    toast.success("Stock adjusted")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            For corrections that aren&apos;t a purchase or a sale, like a
            recount, damage, or missing stock.
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
                          {item.name} — currently {item.current_quantity}{" "}
                          {item.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REASONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isCorrection
                      ? `Actual counted quantity${selectedItem ? ` (${selectedItem.unit})` : ""}`
                      : `Quantity${selectedItem ? ` (${selectedItem.unit})` : ""}`}
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What happened? e.g. Monthly count found 2kg less than system."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                Save Adjustment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
