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
import { ProductCombobox, MachineCombobox } from "@/components/ppc/comboboxes"

import type { ProductMachineCapacity } from "@/types/ppc/master"
import {
  useCreateProductMachineCapacity,
  useUpdateProductMachineCapacity,
} from "@/hooks/ppc/use-masters"

interface CapacityFormValues {
  cpmProductSysId: string
  machineId: string
  prodPerDay: string
  efficiencyPct: string
}

const numericString = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Must be a number")

const positiveInt = z
  .string()
  .min(1, "Required")
  .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Must be a positive integer")

const formSchema = z.object({
  cpmProductSysId: positiveInt,
  machineId: positiveInt,
  prodPerDay: numericString,
  efficiencyPct: numericString,
})

interface CapacityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  capacity?: ProductMachineCapacity | null
}

export function CapacityFormDialog({ open, onOpenChange, capacity }: CapacityFormDialogProps) {
  const isEditing = !!capacity
  const createMutation = useCreateProductMachineCapacity()
  const updateMutation = useUpdateProductMachineCapacity()

  const form = useForm<CapacityFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: { cpmProductSysId: "", machineId: "", prodPerDay: "", efficiencyPct: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        capacity
          ? {
              cpmProductSysId: String(capacity.cpmProductSysId || ""),
              machineId: String(capacity.machineId || ""),
              prodPerDay: capacity.prodPerDay || "",
              efficiencyPct: capacity.efficiencyPct || "",
            }
          : { cpmProductSysId: "", machineId: "", prodPerDay: "", efficiencyPct: "" }
      )
    }
  }, [open, capacity, form])

  const onSubmit = async (values: CapacityFormValues) => {
    try {
      if (isEditing && capacity) {
        await updateMutation.mutateAsync({
          id: String(capacity.capacityId),
          data: {
            capacityId: capacity.capacityId,
            prodPerDay: values.prodPerDay || "0",
            efficiencyPct: values.efficiencyPct || "0",
          },
        })
      } else {
        await createMutation.mutateAsync({
          cpmProductSysId: Number(values.cpmProductSysId),
          machineId: Number(values.machineId),
          prodPerDay: values.prodPerDay || "0",
          efficiencyPct: values.efficiencyPct || "0",
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save capacity:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Capacity" : "Add Capacity"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the planning capacity. Product and machine cannot be changed."
              : "Create a product-machine planning capacity."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cpmProductSysId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <FormControl>
                      <ProductCombobox
                        value={field.value ? Number(field.value) : undefined}
                        onChange={(id) => field.onChange(String(id))}
                        disabled={isEditing || isPending}
                      />
                    </FormControl>
                    <FormDescription>Finance cost product master.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine</FormLabel>
                    <FormControl>
                      <MachineCombobox
                        value={field.value ? Number(field.value) : undefined}
                        onChange={(id) => field.onChange(String(id))}
                        disabled={isEditing || isPending}
                      />
                    </FormControl>
                    <FormDescription>PPC machine.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prodPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prod / Day</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="efficiencyPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efficiency %</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
