"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createClient } from "@/lib/supabase/client"
import type { BusinessSettings } from "@/types/database"

const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN"]
const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
]

const settingsSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  logo_url: z.string().url().or(z.literal("")).optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  address: z.string().optional(),
  currency: z.string().min(1),
  receipt_footer: z.string().optional(),
  tax_rate: z.number().min(0).max(100),
  tax_inclusive: z.boolean(),
  payment_methods: z.array(z.string()).min(1, "Select at least one payment method"),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: settings.business_name,
      logo_url: settings.logo_url ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      address: settings.address ?? "",
      currency: settings.currency,
      receipt_footer: settings.receipt_footer ?? "",
      tax_rate: settings.tax_rate,
      tax_inclusive: settings.tax_inclusive,
      payment_methods: settings.payment_methods,
    },
  })

  async function onSubmit(values: SettingsFormValues) {
    setIsSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("business_settings")
      .update({
        business_name: values.business_name,
        logo_url: values.logo_url || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        currency: values.currency,
        receipt_footer: values.receipt_footer || null,
        tax_rate: values.tax_rate,
        tax_inclusive: values.tax_inclusive,
        payment_methods: values.payment_methods,
      })
      .eq("id", settings.id)
    setIsSaving(false)

    if (error) {
      toast.error("Could not save settings", { description: error.message })
      return
    }

    toast.success("Settings saved")
  }

  function togglePaymentMethod(value: string, checked: boolean) {
    const current = form.getValues("payment_methods")
    form.setValue(
      "payment_methods",
      checked
        ? [...current, value]
        : current.filter((method) => method !== value),
      { shouldValidate: true }
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-2xl flex-col gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Shown on receipts and throughout the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Marvin Coffee Spot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+233 20 000 0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="hello@marvincoffee.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Shop address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipt & Tax</CardTitle>
            <CardDescription>
              Controls how totals and receipts are calculated and printed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tax_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tax_inclusive"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Prices include tax</FormLabel>
                    <FormDescription>
                      When on, menu prices already include tax.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receipt_footer"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Receipt Footer</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Thank you for visiting Marvin Coffee Spot!"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Choose which payment methods cashiers can select at checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="payment_methods"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-3">
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <FormLabel className="font-normal">
                        {option.label}
                      </FormLabel>
                      <Switch
                        checked={field.value.includes(option.value)}
                        onCheckedChange={(checked) =>
                          togglePaymentMethod(option.value, checked)
                        }
                      />
                    </div>
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  )
}
