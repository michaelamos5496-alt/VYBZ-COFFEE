"use client"

import { createContext, useContext } from "react"
import type { Staff } from "@/types/database"

const StaffContext = createContext<Staff | null>(null)

export function StaffProvider({
  staff,
  children,
}: {
  staff: Staff | null
  children: React.ReactNode
}) {
  return <StaffContext.Provider value={staff}>{children}</StaffContext.Provider>
}

/** The signed-in user's staff record, as provided by the (app) layout. */
export function useCurrentStaff() {
  return useContext(StaffContext)
}

/** Convenience accessor — `useCurrentStaff()?.role` is the same value. */
export function useCurrentRole() {
  return useContext(StaffContext)?.role ?? null
}
