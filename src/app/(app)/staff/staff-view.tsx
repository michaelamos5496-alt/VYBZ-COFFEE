"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Search, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/layout/empty-state"
import { ROLE_LABELS } from "@/lib/auth/permissions"
import type { Staff } from "@/types/database"
import { StaffDialog } from "./staff-dialog"

export function StaffView({
  staff,
  currentUserId,
}: {
  staff: Staff[]
  currentUserId: string
}) {
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Staff | null>(null)

  const filteredStaff = useMemo(() => {
    if (search.trim() === "") return staff
    const term = search.trim().toLowerCase()
    return staff.filter(
      (member) =>
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term)
    )
  }, [staff, search])

  function openInvite() {
    setEditingMember(null)
    setDialogOpen(true)
  }

  function openEdit(member: Staff) {
    setEditingMember(member)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search staff…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={openInvite}>
          <Plus />
          Invite Staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members yet"
          description="Invite your team so cashiers and managers can sign in and start working."
          actionLabel="Invite Staff"
          onAction={openInvite}
        />
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching staff"
          description="Try a different search term."
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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.name}
                    {member.id === currentUserId && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{ROLE_LABELS[member.role]}</TableCell>
                  <TableCell>
                    <Badge variant={member.active ? "default" : "secondary"}>
                      {member.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(member)}
                      aria-label={`Edit ${member.name}`}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editingMember}
        isSelf={editingMember?.id === currentUserId}
      />
    </div>
  )
}
