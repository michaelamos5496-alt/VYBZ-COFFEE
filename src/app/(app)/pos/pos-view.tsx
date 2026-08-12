"use client"

import { useMemo, useState, useTransition } from "react"
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
      router.refresh()
    })
  }

  function handleRetrieve(order: HeldOrderSummary) {
    setCart(heldOrderToCart(order.order_items))
    setDiscount(0)
  }

  return (
    <div className="flex h-svh flex-col">
      <AppHeader title="New Sale" />
      <div className="grid flex-1 grid-cols-[220px_1fr_360px] overflow-hidden">
      {/* LEFT: categories */}
      <div className="bg-sidebar text-sidebar-foreground flex flex-col overflow-y-auto border-r">
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
        <div className="flex items-center gap-3 border-b p-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search products…"
              className="h-11 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setHeldOrdersOpen(true)}
          >
            <Clock />
            Held
            {heldOrders.length > 0 && (
              <Badge variant="secondary">{heldOrders.length}</Badge>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
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

      {/* RIGHT: cart */}
      <div className="bg-background overflow-hidden border-l">
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
          onCheckout={() => {
            setCheckoutKey((k) => k + 1)
            setCheckoutOpen(true)
          }}
          isBusy={isPending}
        />
      </div>
      </div>

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
