"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ROLE_LABELS } from "@/lib/auth/permissions"
import type { Staff, StaffRole } from "@/types/database"
import { inviteStaff, updateStaff } from "./actions"

const ROLES: StaffRole[] = ["admin", "manager", "cashier"]

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  role: z.enum(ROLES as [StaffRole, ...StaffRole[]]),
})

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(ROLES as [StaffRole, ...StaffRole[]]),
  active: z.boolean(),
})

type InviteFormValues = z.infer<typeof inviteSchema>
type EditFormValues = z.infer<typeof editSchema>

export function StaffDialog({
  open,
  onOpenChange,
  member,
  isSelf,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Staff | null
  isSelf: boolean
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const isEdit = !!member

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "cashier" },
  })

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: member?.name ?? "",
      role: member?.role ?? "cashier",
      active: member?.active ?? true,
    },
  })

  useEffect(() => {
    if (open) {
      inviteForm.reset({ name: "", email: "", role: "cashier" })
      editForm.reset({
        name: member?.name ?? "",
        role: member?.role ?? "cashier",
        active: member?.active ?? true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member])

  async function onInviteSubmit(values: InviteFormValues) {
    setIsSaving(true)
    const result = await inviteStaff(values)
    setIsSaving(false)

    if (result.error) {
      toast.error("Could not invite staff member", { description: result.error })
      return
    }

    toast.success(`Invited ${values.name}`)
    onOpenChange(false)
    router.refresh()
  }

  async function onEditSubmit(values: EditFormValues) {
    if (!member) return
    setIsSaving(true)
    const result = await updateStaff(member.id, values)
    setIsSaving(false)

    if (result.error) {
      toast.error("Could not update staff member", { description: result.error })
      return
    }

    toast.success("Staff member updated")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Staff Member" : "Invite Staff"}</DialogTitle>
          {!isEdit && (
            <DialogDescription>
              They&apos;ll get an email invite to set a password and sign in.
            </DialogDescription>
          )}
        </DialogHeader>

        {isEdit ? (
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSelf}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSelf && (
                      <p className="text-muted-foreground text-xs">
                        You can&apos;t change your own role.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-muted-foreground text-xs">
                        Inactive staff can&apos;t sign in.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSelf}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...inviteForm}>
            <form
              onSubmit={inviteForm.handleSubmit(onInviteSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={inviteForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Ama Mensah" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="ama@vybz.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="animate-spin" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
