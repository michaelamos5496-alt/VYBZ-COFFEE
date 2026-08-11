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

const posNav = [{ title: "New Sale", url: "/pos", icon: ShoppingCart }]

const managementNav = [
  { title: "Products", url: "/products", icon: Package },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Recipes", url: "/recipes", icon: ClipboardList },
  { title: "Staff", url: "/staff", icon: Users },
]

const reportsNav = [
  { title: "Sales", url: "/reports/sales", icon: LineChart },
  { title: "Inventory", url: "/reports/inventory", icon: Warehouse },
]

const systemNav = [{ title: "Settings", url: "/settings", icon: Settings }]

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: { title: string; url: string; icon: React.ElementType }[]
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Coffee className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">
                  Marvin Coffee Spot
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
        <NavGroup label="POS" items={posNav} pathname={pathname} />
        <NavGroup
          label="Management"
          items={managementNav}
          pathname={pathname}
        />
        <NavGroup label="Reports" items={reportsNav} pathname={pathname} />
        <NavGroup label="System" items={systemNav} pathname={pathname} />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
