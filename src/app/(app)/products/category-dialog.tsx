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
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { Category } from "@/types/database"
import {
  createCategory,
  updateCategory,
  type CategoryInput,
} from "./categories-actions"

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

function toDefaultValues(category: Category | null): CategoryFormValues {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
  }
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const isEdit = !!category

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: toDefaultValues(category),
  })

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(category))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category])

  async function onSubmit(values: CategoryFormValues) {
    setIsSaving(true)

    const input: CategoryInput = {
      name: values.name,
      description: values.description || null,
    }

    const result = isEdit
      ? await updateCategory(category.id, input)
      : await createCategory(input)

    setIsSaving(false)

    if (result.error) {
      toast.error("Could not save category", { description: result.error })
      return
    }

    toast.success(isEdit ? "Category updated" : "Category created")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Coffee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                {isEdit ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
