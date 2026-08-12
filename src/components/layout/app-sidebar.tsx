"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Coffee,
  ShoppingCart,
  Package,
  Boxes,
  ClipboardList,
  Users,
  LineChart,
  Warehouse,
  TrendingUp,
  Settings,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useCurrentRole } from "@/lib/auth/role-context"
import {
  canManageRecipes,
  canManageSettings,
  canManageStaff,
  canViewInventory,
  canViewProducts,
  canViewReports,
} from "@/lib/auth/permissions"
import type { StaffRole } from "@/types/database"

type NavItem = {
  title: string
  url: string
  icon: React.ElementType
  visible: (role: StaffRole | null) => boolean
}

const posNav: NavItem[] = [
  { title: "New Sale", url: "/pos", icon: ShoppingCart, visible: () => true },
]

const managementNav: NavItem[] = [
  { title: "Products", url: "/products", icon: Package, visible: canViewProducts },
  { title: "Inventory", url: "/inventory", icon: Boxes, visible: canViewInventory },
  { title: "Recipes", url: "/recipes", icon: ClipboardList, visible: canManageRecipes },
  { title: "Staff", url: "/staff", icon: Users, visible: canManageStaff },
]

const reportsNav: NavItem[] = [
  { title: "Sales", url: "/reports/sales", icon: LineChart, visible: () => true },
  { title: "Inventory", url: "/reports/inventory", icon: Warehouse, visible: canViewReports },
  { title: "Products", url: "/reports/products", icon: TrendingUp, visible: canViewReports },
]

const systemNav: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings, visible: canManageSettings },
]

function NavGroup({
  label,
  items,
  pathname,
  role,
}: {
  label: string
  items: NavItem[]
  pathname: string
  role: StaffRole | null
}) {
  const visibleItems = items.filter((item) => item.visible(role))
  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.url || pathname.startsWith(`${item.url}/`)
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  isActive={isActive}
                  size="lg"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const role = useCurrentRole()
  const homeUrl = canViewReports(role) ? "/dashboard" : "/pos"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={homeUrl} />}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Coffee className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">
                  Vybz
                </span>
                <span className="text-sidebar-foreground/60 truncate text-xs">
                  Point of Sale
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="POS" items={posNav} pathname={pathname} role={role} />
        <NavGroup
          label="Management"
          items={managementNav}
          pathname={pathname}
          role={role}
        />
        <NavGroup
          label="Reports"
          items={reportsNav}
          pathname={pathname}
          role={role}
        />
        <NavGroup
          label="System"
          items={systemNav}
          pathname={pathname}
          role={role}
        />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
