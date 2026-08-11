import type { InventoryUnit } from "@/types/database"

type UnitFamily = "mass" | "volume" | "piece" | "pack" | "bottle"

const UNIT_FAMILY: Record<InventoryUnit, UnitFamily> = {
  g: "mass",
  kg: "mass",
  ml: "volume",
  litre: "volume",
  piece: "piece",
  pack: "pack",
  bottle: "bottle",
}

const UNIT_BASE_FACTOR: Record<InventoryUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  litre: 1000,
  piece: 1,
  pack: 1,
  bottle: 1,
}

export class IncompatibleUnitError extends Error {
  constructor(from: InventoryUnit, to: InventoryUnit) {
    super(`Cannot convert ${from} to ${to}: incompatible units`)
    this.name = "IncompatibleUnitError"
  }
}

export function unitsAreCompatible(a: InventoryUnit, b: InventoryUnit) {
  return UNIT_FAMILY[a] === UNIT_FAMILY[b]
}

export function compatibleUnits(unit: InventoryUnit): InventoryUnit[] {
  const family = UNIT_FAMILY[unit]
  return (Object.keys(UNIT_FAMILY) as InventoryUnit[]).filter(
    (candidate) => UNIT_FAMILY[candidate] === family
  )
}

/** Converts a quantity between units in the same family (mass: g/kg, volume: ml/litre). */
export function convertQuantity(
  quantity: number,
  from: InventoryUnit,
  to: InventoryUnit
): number {
  if (!unitsAreCompatible(from, to)) {
    throw new IncompatibleUnitError(from, to)
  }
  return (quantity * UNIT_BASE_FACTOR[from]) / UNIT_BASE_FACTOR[to]
}
