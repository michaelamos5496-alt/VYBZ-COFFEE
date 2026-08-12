"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Clock, Coffee, Search } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { AppHeader } from "@/components/layout/app-header"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { BusinessSettings, Category, PaymentMethod, Product } from "@/types/database"
import {
  addToCart,
  cartToSaleItems,
  clearCart,
  decrementQuantity,
  heldOrderToCart,
  incrementQuantity,
  removeFromCart,
  type CartItem,
} from "@/lib/pos/cart"
import { calculateOrderTotals } from "@/lib/pos/order-totals"
import { useBarcodeScanner } from "@/lib/pos/use-barcode-scanner"
import { CartPanel } from "./cart-panel"
import { CheckoutDialog } from "./checkout-dialog"
import { HeldOrdersDialog } from "./held-orders-dialog"
import { holdOrder } from "./actions"
import type { HeldOrderSummary } from "./types"

const ALL_CATEGORIES = "all"
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "mobile_money"]

export function PosView({
  categories,
  products,
  settings,
  heldOrders,
  cashierName,
}: {
  categories: Category[]
  products: Product[]
  settings: BusinessSettings | null
  heldOrders: HeldOrderSummary[]
  cashierName: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutKey, setCheckoutKey] = useState(0)
  const [heldOrdersOpen, setHeldOrdersOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const anyDialogOpen =
    checkoutOpen || heldOrdersOpen || cancelConfirmOpen || cartSheetOpen

  const paymentMethods = (
    settings?.payment_methods && settings.payment_methods.length > 0
      ? (settings.payment_methods as PaymentMethod[])
      : DEFAULT_PAYMENT_METHODS
  ).filter((method): method is PaymentMethod =>
    DEFAULT_PAYMENT_METHODS.includes(method)
  )

  const totals = useMemo(
    () =>
      calculateOrderTotals(
        cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
        Math.min(discount, cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)),
        {
          taxRate: settings?.tax_rate ?? 0,
          taxInclusive: settings?.tax_inclusive ?? true,
        }
      ),
    [cart, discount, settings]
  )

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        search.trim() === "" ||
        product.name.toLowerCase().includes(search.trim().toLowerCase())
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || product.category_id === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [products, search, categoryFilter])

  function handleAddToCart(product: Product) {
    setCart((current) => addToCart(current, product))
  }

  function handleIncrement(productId: string) {
    setCart((current) => incrementQuantity(current, productId))
  }

  function handleDecrement(productId: string) {
    setCart((current) => decrementQuantity(current, productId))
  }

  function handleRemove(productId: string) {
    setCart((current) => removeFromCart(current, productId))
  }

  function handleNewSale() {
    setCart(clearCart())
    setDiscount(0)
  }

  function handleCancel() {
    setCancelConfirmOpen(false)
    setCartSheetOpen(false)
    handleNewSale()
  }

  function handleHold() {
    startTransition(async () => {
      const result = await holdOrder(cartToSaleItems(cart))
      if (result.error) {
        toast.error("Could not hold order", { description: result.error })
        return
      }
      toast.success("Order held")
      handleNewSale()
      setCartSheetOpen(false)
      router.refresh()
    })
  }

  function handleRetrieve(order: HeldOrderSummary) {
    setCart(heldOrderToCart(order.order_items))
    setDiscount(0)
  }

  function handleOpenCheckout() {
    if (cart.length === 0) return
    setCartSheetOpen(false)
    setCheckoutKey((k) => k + 1)
    setCheckoutOpen(true)
  }

  function scanToCart(code: string) {
    const match = products.find(
      (product) => product.sku?.toLowerCase() === code.toLowerCase()
    )
    if (!match) {
      toast.error(`No product found for barcode "${code}"`)
      return
    }
    handleAddToCart(match)
    toast.success(`Added ${match.name}`)
  }

  // Works with any USB/Bluetooth scanner in keyboard-wedge mode — no
  // driver or specific hardware required. Only active when no dialog is
  // open, so a scan can't add an item behind the cashier's back mid-checkout.
  useBarcodeScanner(scanToCart, !anyDialogOpen)

  // Keyboard shortcuts, all inert while typing in a field or with a
  // dialog open, so they never fight with normal typing.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isTyping =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      if (event.key === "/" && !isTyping) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (isTyping || anyDialogOpen) return

      if (event.key === "c" && cart.length > 0) {
        handleOpenCheckout()
      } else if (event.key === "h" && cart.length > 0) {
        handleHold()
      } else if (event.key === "Delete" && cart.length > 0) {
        setCancelConfirmOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length, anyDialogOpen])

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex h-svh flex-col">
      <AppHeader title="New Sale" />
      <div className="grid flex-1 overflow-hidden lg:grid-cols-[220px_1fr_360px]">
      {/* LEFT: categories (desktop only — mobile uses the chip row below the search bar) */}
      <div className="bg-sidebar text-sidebar-foreground hidden flex-col overflow-y-auto border-r lg:flex">
        <nav className="flex flex-col gap-1 p-2">
          <Button
            variant={categoryFilter === ALL_CATEGORIES ? "secondary" : "ghost"}
            className="justify-start"
            onClick={() => setCategoryFilter(ALL_CATEGORIES)}
          >
            All Products
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={categoryFilter === category.id ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setCategoryFilter(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </nav>
      </div>

      {/* CENTER: search + product grid */}
      <div className="flex flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                ref={searchInputRef}
                placeholder="Search products…"
                className="h-11 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // A scanner that types into the focused search box lands
                  // here instead of the global listener (which skips inputs).
                  if (e.key !== "Enter") return
                  const match = products.find(
                    (product) => product.sku?.toLowerCase() === search.trim().toLowerCase()
                  )
                  if (match) {
                    e.preventDefault()
                    handleAddToCart(match)
                    toast.success(`Added ${match.name}`)
                    setSearch("")
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setHeldOrdersOpen(true)}
            >
              <Clock />
              <span className="hidden sm:inline">Held</span>
              {heldOrders.length > 0 && (
                <Badge variant="secondary">{heldOrders.length}</Badge>
              )}
            </Button>
          </div>

          {/* Mobile category chips — replaces the sidebar list with a
              thumb-friendly horizontal scroller on small screens. */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 lg:hidden">
            <Button
              size="sm"
              variant={categoryFilter === ALL_CATEGORIES ? "default" : "outline"}
              className="shrink-0 rounded-full"
              onClick={() => setCategoryFilter(ALL_CATEGORIES)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                size="sm"
                variant={categoryFilter === category.id ? "default" : "outline"}
                className="shrink-0 rounded-full"
                onClick={() => setCategoryFilter(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-28 lg:pb-4">
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No products found"
              description="Try a different search term or category."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product) => {
                const inCartQty = cart.find(
                  (item) => item.productId === product.id
                )?.quantity

                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="bg-card hover:border-primary focus-visible:border-primary relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-colors focus-visible:outline-none active:scale-[0.98]"
                  >
                    {inCartQty ? (
                      <Badge className="absolute top-2 right-2">{inCartQty}</Badge>
                    ) : null}
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt=""
                        className="size-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex size-14 items-center justify-center rounded-lg">
                        <Coffee className="text-muted-foreground size-6" />
                      </div>
                    )}
                    <div>
                      <p className="line-clamp-2 text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="text-muted-foreground text-sm tabular-nums">
                        GH₵{Number(product.selling_price).toFixed(2)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: cart (desktop only — mobile uses the bottom bar + sheet below) */}
      <div className="bg-background hidden overflow-hidden border-l lg:block">
        <CartPanel
          cart={cart}
          totals={totals}
          discount={discount}
          onDiscountChange={setDiscount}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
          onHold={handleHold}
          onCancel={() => setCancelConfirmOpen(true)}
          onCheckout={handleOpenCheckout}
          isBusy={isPending}
        />
      </div>
      </div>

      {/* Mobile bottom cart bar — a single, unmissable tap target that
          mirrors the "view cart" pattern of simple mobile storefronts. */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartSheetOpen(true)}
          className="bg-primary text-primary-foreground fixed inset-x-3 bottom-3 z-20 flex h-14 items-center justify-between rounded-xl px-4 shadow-lg active:scale-[0.98] lg:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
              {cartItemCount}
            </Badge>
            View Cart
          </span>
          <span className="text-base font-semibold tabular-nums">
            GH₵{totals.total.toFixed(2)}
          </span>
        </button>
      )}

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="h-[88vh] p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Current Order</SheetTitle>
          </SheetHeader>
          <CartPanel
            cart={cart}
            totals={totals}
            discount={discount}
            onDiscountChange={setDiscount}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onHold={handleHold}
            onCancel={() => setCancelConfirmOpen(true)}
            onCheckout={handleOpenCheckout}
            isBusy={isPending}
          />
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        key={checkoutKey}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        totals={totals}
        discount={totals.discount}
        paymentMethods={paymentMethods}
        settings={settings}
        cashierName={cashierName}
        onNewSale={handleNewSale}
      />

      <HeldOrdersDialog
        open={heldOrdersOpen}
        onOpenChange={setHeldOrdersOpen}
        heldOrders={heldOrders}
        onRetrieve={handleRetrieve}
      />

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the current cart. Nothing has been charged or
              deducted from inventory yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleCancel}>
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
