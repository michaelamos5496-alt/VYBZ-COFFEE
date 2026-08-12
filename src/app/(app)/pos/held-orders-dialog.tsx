"use client"

import { useState, useTransition } from "react"
import { Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import type { HeldOrderSummary } from "./types"
import { deleteHeldOrder } from "./actions"

export function HeldOrdersDialog({
  open,
  onOpenChange,
  heldOrders,
  onRetrieve,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  heldOrders: HeldOrderSummary[]
  onRetrieve: (order: HeldOrderSummary) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete() {
    if (!deletingId) return
    const id = deletingId
    startTransition(async () => {
      const result = await deleteHeldOrder(id)
      if (result.error) {
        toast.error("Could not cancel held order", { description: result.error })
        return
      }
      toast.success("Held order cancelled")
      setDeletingId(null)
      router.refresh()
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Held Orders</DialogTitle>
          </DialogHeader>

          {heldOrders.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No held orders"
              description="Orders you hold will show up here so you can pick them back up."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {heldOrders.map((order) => {
                const itemCount = order.order_items.reduce(
                  (sum, item) => sum + item.quantity,
                  0
                )
                return (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {itemCount} item{itemCount === 1 ? "" : "s"} — GH₵
                        {Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Held at {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          onRetrieve(order)
                          onOpenChange(false)
                        }}
                      >
                        Retrieve
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingId(order.id)}
                        aria-label="Cancel held order"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this held order?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. No inventory was deducted for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
