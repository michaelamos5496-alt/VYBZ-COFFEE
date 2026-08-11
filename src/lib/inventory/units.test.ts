import { describe, expect, it } from "vitest"

import {
  compatibleUnits,
  convertQuantity,
  IncompatibleUnitError,
  unitsAreCompatible,
} from "./units"

describe("convertQuantity", () => {
  it("converts grams to kilograms", () => {
    expect(convertQuantity(1000, "g", "kg")).toBe(1)
  })

  it("converts kilograms to grams", () => {
    expect(convertQuantity(1.5, "kg", "g")).toBe(1500)
  })

  it("converts litres to millilitres", () => {
    expect(convertQuantity(1, "litre", "ml")).toBe(1000)
  })

  it("converts millilitres to litres", () => {
    expect(convertQuantity(250, "ml", "litre")).toBe(0.25)
  })

  it("is a no-op when units already match", () => {
    expect(convertQuantity(18, "g", "g")).toBe(18)
    expect(convertQuantity(3, "piece", "piece")).toBe(3)
  })

  it("throws when converting between incompatible families", () => {
    expect(() => convertQuantity(18, "g", "ml")).toThrow(IncompatibleUnitError)
    expect(() => convertQuantity(1, "piece", "pack")).toThrow(
      IncompatibleUnitError
    )
    expect(() => convertQuantity(1, "bottle", "piece")).toThrow(
      IncompatibleUnitError
    )
  })
})

describe("unitsAreCompatible", () => {
  it("treats mass units as compatible with each other", () => {
    expect(unitsAreCompatible("g", "kg")).toBe(true)
  })

  it("treats volume units as compatible with each other", () => {
    expect(unitsAreCompatible("ml", "litre")).toBe(true)
  })

  it("treats count units as incompatible with each other", () => {
    expect(unitsAreCompatible("piece", "pack")).toBe(false)
    expect(unitsAreCompatible("pack", "bottle")).toBe(false)
  })

  it("treats mass and volume as incompatible", () => {
    expect(unitsAreCompatible("g", "ml")).toBe(false)
  })
})

describe("compatibleUnits", () => {
  it("returns the full mass family for a mass unit", () => {
    expect(compatibleUnits("kg").sort()).toEqual(["g", "kg"])
  })

  it("returns only itself for a count unit", () => {
    expect(compatibleUnits("piece")).toEqual(["piece"])
  })
})
