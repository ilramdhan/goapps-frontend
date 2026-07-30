"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import type { Customer } from "@/types/ppc/customer"
import { CUSTOMER_SOURCE_ORACLE } from "@/types/ppc/customer"
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/ppc/use-customer"

interface CustomerFormValues {
  customerCode: string
  customerName: string
  customerShortName: string
  customerTaxNo: string
  customerParentCode: string
  customerIsActive: boolean
}

const formSchema = z.object({
  customerCode: z.string().min(1, "Code is required").max(30, "Max 30 characters"),
  customerName: z.string().min(1, "Name is required").max(240, "Max 240 characters"),
  customerShortName: z.string().max(60, "Max 60 characters"),
  customerTaxNo: z.string().max(60, "Max 60 characters"),
  customerParentCode: z.string().max(30, "Max 30 characters"),
  customerIsActive: z.boolean(),
})

const emptyValues: CustomerFormValues = {
  customerCode: "",
  customerName: "",
  customerShortName: "",
  customerTaxNo: "",
  customerParentCode: "",
  customerIsActive: true,
}

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const isEdit = !!customer
  const isOracleSourced = customer?.customerSource === CUSTOMER_SOURCE_ORACLE

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      customer
        ? {
            customerCode: customer.customerCode || "",
            customerName: customer.customerName || "",
            customerShortName: customer.customerShortName || "",
            customerTaxNo: customer.customerTaxNo || "",
            customerParentCode: customer.customerParentCode || "",
            customerIsActive: customer.customerIsActive ?? true,
          }
        : emptyValues
    )
  }, [open, customer, form])

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (customer) {
        await updateMutation.mutateAsync({
          id: customer.customerId,
          data: {
            customerId: customer.customerId,
            customerName: values.customerName,
            customerShortName: values.customerShortName,
            customerTaxNo: values.customerTaxNo,
            customerParentCode: values.customerParentCode,
            customerIsActive: values.customerIsActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          customerCode: values.customerCode,
          customerName: values.customerName,
          customerShortName: values.customerShortName,
          customerTaxNo: values.customerTaxNo,
          customerParentCode: values.customerParentCode,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save customer:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit Customer — ${customer?.customerCode}` : "Add Customer"}
          </DialogTitle>
          <DialogDescription>
            {isOracleSourced
              ? "This customer is sourced from Orion. Edits here are preserved by the next sync, but the code cannot change."
              : "Hand-added customers are marked MANUAL and are never overwritten by the Orion sync."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={isPending || isEdit}
                      placeholder="DC00594"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>
                    {isEdit
                      ? "The code is the key the Orion sync upserts on, so it is immutable."
                      : "Stored upper-cased so it matches the Orion-sourced rows."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., PT Sinar Tekstil Nusantara"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerShortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Sinar Tekstil"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerTaxNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax No (NPWP)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 01.234.567.8-901.000"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerParentCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional — parent customer code"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>Group head code; leave blank when standalone.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="customerIsActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Inactive customers stay selectable on existing demands but are hidden from
                        new pickers.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
