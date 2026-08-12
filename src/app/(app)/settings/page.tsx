import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { createClient } from "@/lib/supabase/server"
import { getCurrentStaff } from "@/lib/auth/current-staff"
import { canManageSettings } from "@/lib/auth/permissions"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const staff = await getCurrentStaff()
  if (!canManageSettings(staff?.role ?? null)) {
    redirect("/pos")
  }

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from("business_settings")
    .select("*")
    .limit(1)
    .single()

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Settings" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        {settings ? (
          <SettingsForm settings={settings} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Settings could not be loaded.
          </p>
        )}
      </div>
    </div>
  )
}
