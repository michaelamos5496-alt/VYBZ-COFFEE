import { Users, Plus } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .order("name")

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Staff" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Manage who has access and what they can do.
          </p>
          <Button size="sm">
            <Plus />
            Invite Staff
          </Button>
        </div>

        {!staff || staff.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff members yet"
            description="Invite your team so cashiers and managers can sign in and start working."
            actionLabel="Invite Staff"
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="capitalize">
                      {member.role}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.active ? "default" : "secondary"}>
                        {member.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
