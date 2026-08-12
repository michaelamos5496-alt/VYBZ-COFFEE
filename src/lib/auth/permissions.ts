import type { StaffRole } from "@/types/database"

/**
 * Single source of truth for what each role can do in the UI. Mirrors
 * the RLS policies and SECURITY DEFINER checks in
 * supabase/migrations/00007_rbac.sql exactly — this module decides what
 * to render (buttons, nav items, whole pages), the database decides
 * what's actually allowed. If the two ever disagree, the database wins;
 * a hidden button is a convenience, not a security boundary.
 */

type Role = StaffRole | null | undefined

function isRole(role: Role, allowed: StaffRole[]): boolean {
  return role !== null && role !== undefined && allowed.includes(role)
}

const ADMIN_ONLY: StaffRole[] = ["admin"]
const ADMIN_AND_MANAGER: StaffRole[] = ["admin", "manager"]
const ALL_STAFF: StaffRole[] = ["admin", "manager", "cashier"]

// Staff management — admin only.
export const canManageStaff = (role: Role) => isRole(role, ADMIN_ONLY)

// Products & categories — admin/manager manage, everyone can view.
export const canManageProducts = (role: Role) => isRole(role, ADMIN_AND_MANAGER)
export const canViewProducts = (role: Role) => isRole(role, ALL_STAFF)

// Inventory — admin/manager manage (items, stock-in, adjustments,
// movement history), everyone can view current availability.
export const canManageInventory = (role: Role) => isRole(role, ADMIN_AND_MANAGER)
export const canViewInventory = (role: Role) => isRole(role, ALL_STAFF)
export const canViewStockMovementHistory = (role: Role) =>
  isRole(role, ADMIN_AND_MANAGER)

// Recipes — admin/manager only, cashiers have no reason to see these.
export const canManageRecipes = (role: Role) => isRole(role, ADMIN_AND_MANAGER)

// Reports — business-wide figures (dashboard, sales report unrestricted
// by cashier, inventory report, product performance) are admin/manager
// only. Every role can process sales and see their own sales history,
// which the Sales Report page still renders for a cashier — the
// database (search_orders) forces it down to just their own orders, so
// there's nothing extra to gate here in the UI beyond that page always
// being reachable.
export const canViewReports = (role: Role) => isRole(role, ADMIN_AND_MANAGER)
export const canViewOwnSales = (role: Role) => isRole(role, ALL_STAFF)

// Settings — "critical system configuration" is admin only.
export const canManageSettings = (role: Role) => isRole(role, ADMIN_ONLY)

// Sales — every role processes sales at the till.
export const canProcessSales = (role: Role) => isRole(role, ALL_STAFF)

// Audit log — admin only, same as staff management.
export const canViewAuditLog = (role: Role) => isRole(role, ADMIN_ONLY)

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
}
