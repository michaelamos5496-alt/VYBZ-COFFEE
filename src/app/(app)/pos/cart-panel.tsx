"use client"

import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { CartItem } from "@/lib/pos/cart"
import type { OrderTotals } from "@/lib/pos/order-totals"

export function CartPanel({
  cart,
  totals,
  discount,
  onDiscountChange,
  onIncrement,
  onDecrement,
  onRemove,
  onHold,
  onCancel,
  onCheckout,
  isBusy,
}: {
  cart: CartItem[]
  totals: OrderTotals
  discount: number
  onDiscountChange: (value: number) => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onHold: () => void
  onCancel: () => void
  onCheckout: () => void
  isBusy: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-4">
        <ShoppingCart className="size-5" />
        <h2 className="font-semibold">Current Order</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {cart.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm">
            <ShoppingCart className="size-8 opacity-40" />
            <p>Tap a product to add it to the order</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {cart.map((item) => (
              <li
                key={item.productId}
                className="bg-card flex flex-col gap-2 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      GH₵{item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(item.productId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <X />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onDecrement(item.productId)}
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      <Minus />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onIncrement(item.productId)}
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      <Plus />
                    </Button>
                  </div>
                  <span className="font-semibold tabular-nums">
                    GH₵{(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">Discount (GH₵)</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            className="h-8 w-24 text-right"
            value={discount || ""}
            placeholder="0.00"
            onChange={(e) => onDiscountChange(e.target.valueAsNumber || 0)}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">GH₵{totals.subtotal.toFixed(2)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">-GH₵{totals.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">GH₵{totals.tax.toFixed(2)}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">GH₵{totals.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="lg"
            className="h-14 text-base"
            disabled={cart.length === 0 || isBusy}
            onClick={onCheckout}
          >
            Checkout
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={cart.length === 0 || isBusy}
              onClick={onHold}
            >
              Hold Order
            </Button>
            <Button
              variant="outline"
              disabled={cart.length === 0 || isBusy}
              onClick={onCancel}
            >
              <Trash2 />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
