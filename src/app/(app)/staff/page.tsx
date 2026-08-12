import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { getCurrentStaff } from "@/lib/auth/current-staff"
import { canManageStaff } from "@/lib/auth/permissions"
import { StaffView } from "./staff-view"

export default async function StaffPage() {
  const currentStaff = await getCurrentStaff()
  if (!canManageStaff(currentStaff?.role ?? null)) {
    redirect("/pos")
  }

  const supabase = await createClient()
  const { data: staff } = await supabase.from("staff").select("*").order("name")

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Staff" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <StaffView staff={staff ?? []} currentUserId={currentStaff!.id} />
      </div>
    </div>
  )
}
