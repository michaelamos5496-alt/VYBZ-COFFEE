import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import { createPreviewMockClient, isPreviewMode } from "./preview-mock-client"

export function createClient() {
  if (isPreviewMode()) {
    return createPreviewMockClient()
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
