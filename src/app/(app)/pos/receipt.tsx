"use client"

import { useEffect } from "react"
import { Printer, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CartItem } from "@/lib/pos/cart"
import type { OrderTotals } from "@/lib/pos/order-totals"
import { thermalReceiptPrintCss } from "@/lib/pos/receipt-print"
import type { BusinessSettings, CheckoutResult, PaymentMethod } from "@/types/database"

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
}

export function Receipt({
  result,
  cart,
  totals,
  paymentMethod,
  amountReceived,
  change,
  settings,
  cashierName,
  completedAt,
  onNewSale,
}: {
  result: CheckoutResult
  cart: CartItem[]
  totals: OrderTotals
  paymentMethod: PaymentMethod
  amountReceived: number
  change: number
  settings: BusinessSettings | null
  cashierName: string
  completedAt: string
  onNewSale: () => void
}) {
  const businessName = settings?.business_name ?? "JANE DOE CAFE"
  const date = new Date(completedAt)
  const paperWidth = settings?.receipt_paper_width ?? "80mm"

  // Fastest path back to the till: Enter or "n" starts the next sale
  // without reaching for the mouse.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === "n") {
        event.preventDefault()
        onNewSale()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onNewSale])

  return (
    <div>
      <style>{thermalReceiptPrintCss(paperWidth)}</style>
      <DialogHeader>
        <DialogTitle>Sale Complete</DialogTitle>
      </DialogHeader>

      <div data-print-receipt className="flex flex-col gap-3 py-2 text-sm">
        <div className="text-center">
          <p className="font-semibold">{businessName}</p>
          {settings?.address && (
            <p className="text-muted-foreground text-xs">{settings.address}</p>
          )}
          {settings?.phone && (
            <p className="text-muted-foreground text-xs">{settings.phone}</p>
          )}
        </div>

        <Separator />

        <div className="flex justify-between text-xs">
          <span>Order #{result.order_number}</span>
          <span>{date.toLocaleString()}</span>
        </div>
        <div className="text-muted-foreground text-xs">Cashier: {cashierName}</div>

        <Separator />

        <ul className="flex flex-col gap-1.5">
          {cart.map((item) => (
            <li key={item.productId} className="flex justify-between gap-2">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span className="tabular-nums">
                GH₵{(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="flex flex-col gap-1">
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
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">GH₵{totals.total.toFixed(2)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method</span>
            <span>{PAYMENT_LABELS[paymentMethod]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="tabular-nums">GH₵{amountReceived.toFixed(2)}</span>
          </div>
          {paymentMethod === "cash" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change</span>
              <span className="tabular-nums">GH₵{change.toFixed(2)}</span>
            </div>
          )}
        </div>

        {settings?.receipt_footer && (
          <>
            <Separator />
            <p className="text-muted-foreground text-center text-xs">
              {settings.receipt_footer}
            </p>
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => window.print()}>
          <Printer />
          Print Receipt
        </Button>
        <Button className="flex-1" onClick={onNewSale}>
          <ShoppingBag />
          New Sale
          <kbd className="ml-auto hidden rounded border border-current/25 px-1.5 py-0.5 text-[10px] font-normal opacity-60 lg:inline-block">
            Enter
          </kbd>
        </Button>
      </div>
    </div>
  )
}
