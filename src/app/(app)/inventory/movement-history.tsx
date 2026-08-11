import { History } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/layout/empty-state"
import type { StockMovementType } from "@/types/database"

export type MovementWithDetails = {
  id: string
  movement_type: StockMovementType
  quantity: number
  previous_quantity: number
  new_quantity: number
  note: string | null
  created_at: string
  inventory_item: { name: string; unit: string } | null
  staff: { name: string } | null
}

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  purchase: "Stock In",
  sale: "Sale",
  adjustment: "Adjustment",
  waste: "Waste",
  return: "Return",
  opening_stock: "Opening Stock",
}

const MOVEMENT_VARIANTS: Record<
  StockMovementType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  purchase: "default",
  sale: "secondary",
  adjustment: "outline",
  waste: "destructive",
  return: "outline",
  opening_stock: "secondary",
}

export function MovementHistory({
  movements,
}: {
  movements: MovementWithDetails[]
}) {
  if (movements.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No stock movements yet"
        description="Receiving stock or making adjustments will show up here, with a full before-and-after trail."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Previous</TableHead>
            <TableHead>New</TableHead>
            <TableHead>Reason / Note</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="font-medium">
                {movement.inventory_item?.name ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={MOVEMENT_VARIANTS[movement.movement_type]}>
                  {MOVEMENT_LABELS[movement.movement_type]}
                </Badge>
              </TableCell>
              <TableCell
                className={
                  movement.quantity < 0 ? "text-destructive" : "text-foreground"
                }
              >
                {movement.quantity > 0 ? "+" : ""}
                {movement.quantity} {movement.inventory_item?.unit}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {movement.previous_quantity}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {movement.new_quantity}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-64 truncate">
                {movement.note ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {movement.staff?.name ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {new Date(movement.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
