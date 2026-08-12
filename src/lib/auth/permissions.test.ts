import { describe, expect, it } from "vitest"

import {
  canManageInventory,
  canManageProducts,
  canManageRecipes,
  canManageSettings,
  canManageStaff,
  canProcessSales,
  canViewAuditLog,
  canViewInventory,
  canViewOwnSales,
  canViewProducts,
  canViewReports,
  canViewStockMovementHistory,
} from "./permissions"

describe("ADMIN — full access", () => {
  it.each([
    ["Manage staff", canManageStaff],
    ["Manage products", canManageProducts],
    ["Manage inventory", canManageInventory],
    ["Manage recipes", canManageRecipes],
    ["View reports", canViewReports],
    ["Manage settings", canManageSettings],
    ["Process sales", canProcessSales],
  ])("can: %s", (_label, check) => {
    expect(check("admin")).toBe(true)
  })
})

describe("MANAGER", () => {
  it.each([
    ["Process sales", canProcessSales],
    ["Manage products", canManageProducts],
    ["Manage inventory", canManageInventory],
    ["Manage recipes", canManageRecipes],
    ["View reports", canViewReports],
  ])("can: %s", (_label, check) => {
    expect(check("manager")).toBe(true)
  })

  it.each([
    ["Manage staff (admin accounts)", canManageStaff],
    ["Manage settings (critical system configuration)", canManageSettings],
  ])("cannot: %s", (_label, check) => {
    expect(check("manager")).toBe(false)
  })
})

describe("CASHIER", () => {
  it.each([
    ["Process sales", canProcessSales],
    ["View products", canViewProducts],
    ["View relevant inventory availability", canViewInventory],
    ["View their own sales", canViewOwnSales],
  ])("can: %s", (_label, check) => {
    expect(check("cashier")).toBe(true)
  })

  it.each([
    ["Change product pricing (manage products)", canManageProducts],
    ["Adjust inventory", canManageInventory],
    ["Manage recipes", canManageRecipes],
    ["Manage staff", canManageStaff],
    ["Access sensitive reports", canViewReports],
    ["Access stock movement history", canViewStockMovementHistory],
    ["Change system settings", canManageSettings],
    ["View the audit log", canViewAuditLog],
  ])("cannot: %s", (_label, check) => {
    expect(check("cashier")).toBe(false)
  })
})

describe("unauthenticated / unknown role", () => {
  it.each([null, undefined])("denies every capability for %s", (role) => {
    expect(canManageStaff(role)).toBe(false)
    expect(canManageProducts(role)).toBe(false)
    expect(canManageInventory(role)).toBe(false)
    expect(canManageRecipes(role)).toBe(false)
    expect(canViewReports(role)).toBe(false)
    expect(canManageSettings(role)).toBe(false)
    expect(canProcessSales(role)).toBe(false)
    expect(canViewProducts(role)).toBe(false)
    expect(canViewInventory(role)).toBe(false)
    expect(canViewOwnSales(role)).toBe(false)
    expect(canViewAuditLog(role)).toBe(false)
    expect(canViewStockMovementHistory(role)).toBe(false)
  })
})

describe("cross-role matrix — every role x every capability", () => {
  const roles = ["admin", "manager", "cashier"] as const
  const expected: Record<string, Record<(typeof roles)[number], boolean>> = {
    canManageStaff: { admin: true, manager: false, cashier: false },
    canManageProducts: { admin: true, manager: true, cashier: false },
    canViewProducts: { admin: true, manager: true, cashier: true },
    canManageInventory: { admin: true, manager: true, cashier: false },
    canViewInventory: { admin: true, manager: true, cashier: true },
    canViewStockMovementHistory: { admin: true, manager: true, cashier: false },
    canManageRecipes: { admin: true, manager: true, cashier: false },
    canViewReports: { admin: true, manager: true, cashier: false },
    canViewOwnSales: { admin: true, manager: true, cashier: true },
    canManageSettings: { admin: true, manager: false, cashier: false },
    canProcessSales: { admin: true, manager: true, cashier: true },
    canViewAuditLog: { admin: true, manager: false, cashier: false },
  }

  const checks: Record<string, (role: typeof roles[number]) => boolean> = {
    canManageStaff,
    canManageProducts,
    canViewProducts,
    canManageInventory,
    canViewInventory,
    canViewStockMovementHistory,
    canManageRecipes,
    canViewReports,
    canViewOwnSales,
    canManageSettings,
    canProcessSales,
    canViewAuditLog,
  }

  for (const [name, fn] of Object.entries(checks)) {
    for (const role of roles) {
      it(`${name}(${role}) === ${expected[name][role]}`, () => {
        expect(fn(role)).toBe(expected[name][role])
      })
    }
  }
})
