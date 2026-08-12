"use client"

import { useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cartToSaleItems, type CartItem } from "@/lib/pos/cart"
import {
  calculateChange,
  isCashSufficient,
  type OrderTotals,
} from "@/lib/pos/order-totals"
import type {
  BusinessSettings,
  CheckoutResult,
  PaymentMethod,
} from "@/types/database"
import { checkoutOrder } from "./actions"
import { Receipt } from "./receipt"

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
}

type Step = "payment" | "receipt"

export function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  totals,
  discount,
  paymentMethods,
  settings,
  cashierName,
  onNewSale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: CartItem[]
  totals: OrderTotals
  discount: number
  paymentMethods: PaymentMethod[]
  settings: BusinessSettings | null
  cashierName: string
  onNewSale: () => void
}) {
  const [step, setStep] = useState<Step>("payment")
  const [method, setMethod] = useState<PaymentMethod>(paymentMethods[0] ?? "cash")
  const [amountReceivedInput, setAmountReceivedInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [completedAt, setCompletedAt] = useState<string>("")
  // One key per checkout attempt (this dialog instance) — stable across
  // retries of the same attempt, so a double-click or a retried request
  // replays the same order instead of creating a duplicate.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const isSubmittingRef = useRef(false)

  const amountReceived = parseFloat(amountReceivedInput || "0") || 0
  const change = calculateChange(amountReceived, totals.total)
  const cashValid = method !== "cash" || isCashSufficient(amountReceived, totals.total)

  function setQuickAmount(value: number) {
    setAmountReceivedInput(value.toFixed(2))
  }

  async function handleConfirm() {
    // Belt-and-suspenders against a double-click outrunning the
    // `disabled` prop's next render — the real guarantee is the
    // idempotency key, this just avoids firing a second request at all.
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)

    const response = await checkoutOrder({
      items: cartToSaleItems(cart),
      discount,
      paymentMethod: method,
      amountReceived: method === "cash" ? amountReceived : null,
      idempotencyKey,
    })

    isSubmittingRef.current = false
    setIsSubmitting(false)

    if (response.error || !response.result) {
      toast.error("Checkout failed", { description: response.error ?? undefined })
      return
    }

    setResult(response.result)
    setCompletedAt(new Date().toISOString())
    setStep("receipt")
  }

  function handleNewSale() {
    onOpenChange(false)
    onNewSale()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Prevent dismissing mid-receipt; force an explicit "New Sale".
        if (!next && step === "receipt") return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === "payment" ? (
          <>
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm">Total Due</p>
                <p className="text-3xl font-semibold tabular-nums">
                  GH₵{totals.total.toFixed(2)}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={method === option ? "default" : "outline"}
                      onClick={() => setMethod(option)}
                    >
                      {PAYMENT_LABELS[option]}
                    </Button>
                  ))}
                </div>
              </div>

              {method === "cash" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="amount-received">Amount Received</Label>
                  <Input
                    id="amount-received"
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={amountReceivedInput}
                    onChange={(e) => setAmountReceivedInput(e.target.value)}
                    placeholder="0.00"
                    className="h-12 text-lg"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(totals.total)}
                    >
                      Exact
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(Math.ceil(totals.total / 10) * 10)}
                    >
                      GH₵{(Math.ceil(totals.total / 10) * 10).toFixed(0)}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(Math.ceil(totals.total / 50) * 50)}
                    >
                      GH₵{(Math.ceil(totals.total / 50) * 50).toFixed(0)}
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Change Due</span>
                    <span
                      className={
                        change < 0
                          ? "text-destructive font-semibold"
                          : "font-semibold tabular-nums"
                      }
                    >
                      GH₵{Math.max(change, 0).toFixed(2)}
                    </span>
                  </div>
                  {!cashValid && amountReceivedInput !== "" && (
                    <p className="text-destructive text-sm">
                      Amount received is less than the total due.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Confirm once the {PAYMENT_LABELS[method].toLowerCase()} payment
                  has gone through on the terminal.
                </p>
              )}

              <Button
                size="lg"
                className="h-12"
                disabled={!cashValid || isSubmitting}
                onClick={handleConfirm}
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {method === "cash" ? "Complete Sale" : "Confirm Payment Received"}
              </Button>
            </div>
          </>
        ) : (
          result && (
            <Receipt
              result={result}
              cart={cart}
              totals={totals}
              paymentMethod={method}
              amountReceived={method === "cash" ? amountReceived : totals.total}
              change={method === "cash" ? Math.max(change, 0) : 0}
              settings={settings}
              cashierName={cashierName}
              completedAt={completedAt}
              onNewSale={handleNewSale}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
