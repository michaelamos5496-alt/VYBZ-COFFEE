import { Coffee } from "lucide-react"

import { SignOutButton } from "./sign-out-button"

export default function AccountInactivePage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <Coffee className="size-5" />
        </div>
        <span className="text-lg font-semibold">JANE DOE CAFE</span>
      </div>
      <div className="bg-card flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border p-6 text-center shadow-sm">
        <h1 className="font-semibold">Account deactivated</h1>
        <p className="text-muted-foreground text-sm">
          Your account has been deactivated. Contact an administrator if you
          believe this is a mistake.
        </p>
        <SignOutButton />
      </div>
    </div>
  )
}
