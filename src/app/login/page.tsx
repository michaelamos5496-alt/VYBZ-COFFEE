import { Coffee } from "lucide-react"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="bg-muted relative flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <Coffee className="size-5" />
        </div>
        <span className="text-lg font-semibold">Vybz</span>
      </div>
      <LoginForm />
    </div>
  )
}
