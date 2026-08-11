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

import {
  type SpinFixedCost,
  PERIOD_PATTERN,
  formatPeriod,
  periodToMonthInput,
  monthInputToPeriod,
} from "@/types/finance/spin-fixed-cost"
import { useCreateSpinFixedCost, useUpdateSpinFixedCost } from "@/hooks/finance/use-spin-fixed-cost"

interface SpinFixedCostFormValues {
  period: string
  commonPoyDenier: number
  poyProduction: number
  spinPowerMonth: number
  spinManpowerMonth: number
  spinOverheadsMonth: number
  spinConssprsMonth: number
  isActive: boolean
}

// commonPoyDenier and poyProduction are DIVISORS in the calc engine - a zero
// there zeroes out the fixed cost of every POY product, so they must be > 0.
const DIVISOR_MESSAGE =
  "Must be greater than 0 - this value is a divisor in the calc engine, and zero would zero out the fixed cost of every POY product."

const spinFixedCostFormSchema = z.object({
  period: z
    .string()
    .min(1, "Period is required")
    .regex(PERIOD_PATTERN, "Period must be in YYYYMM format (e.g. 202604)"),
  commonPoyDenier: z.coerce.number().positive(DIVISOR_MESSAGE),
  poyProduction: z.coerce.number().positive(DIVISOR_MESSAGE),
  spinPowerMonth: z.coerce.number().min(0, "Must be 0 or greater"),
  spinManpowerMonth: z.coerce.number().min(0, "Must be 0 or greater"),
  spinOverheadsMonth: z.coerce.number().min(0, "Must be 0 or greater"),
  spinConssprsMonth: z.coerce.number().min(0, "Must be 0 or greater"),
  isActive: z.boolean(),
})

const EMPTY_VALUES: SpinFixedCostFormValues = {
  period: "",
  commonPoyDenier: 0,
  poyProduction: 0,
  spinPowerMonth: 0,
  spinManpowerMonth: 0,
  spinOverheadsMonth: 0,
  spinConssprsMonth: 0,
  isActive: true,
}

const MONTHLY_FIELDS = [
  { name: "spinPowerMonth", label: "Spin Power / Month" },
  { name: "spinManpowerMonth", label: "Spin Manpower / Month" },
  { name: "spinOverheadsMonth", label: "Spin Overheads / Month" },
  { name: "spinConssprsMonth", label: "Spin Cons. Spares / Month" },
] as const

interface SpinFixedCostFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spinFixedCost?: SpinFixedCost | null
  onSuccess?: () => void
}

export function SpinFixedCostFormDialog({
  open,
  onOpenChange,
  spinFixedCost,
  onSuccess,
}: SpinFixedCostFormDialogProps) {
  const isEditing = !!spinFixedCost
  const createMutation = useCreateSpinFixedCost()
  const updateMutation = useUpdateSpinFixedCost()

  const form = useForm<SpinFixedCostFormValues>({
    resolver: zodResolver(spinFixedCostFormSchema) as never,
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (open) {
      if (spinFixedCost) {
        form.reset({
          period: spinFixedCost.period || "",
          commonPoyDenier: spinFixedCost.commonPoyDenier ?? 0,
          poyProduction: spinFixedCost.poyProduction ?? 0,
          spinPowerMonth: spinFixedCost.spinPowerMonth ?? 0,
          spinManpowerMonth: spinFixedCost.spinManpowerMonth ?? 0,
          spinOverheadsMonth: spinFixedCost.spinOverheadsMonth ?? 0,
          spinConssprsMonth: spinFixedCost.spinConssprsMonth ?? 0,
          isActive: spinFixedCost.isActive ?? true,
        })
      } else {
        form.reset(EMPTY_VALUES)
      }
    }
  }, [open, spinFixedCost, form])

  const onSubmit = async (values: SpinFixedCostFormValues) => {
    try {
      if (isEditing && spinFixedCost) {
        // `period` is immutable and is deliberately not sent on update.
        await updateMutation.mutateAsync({
          id: spinFixedCost.id,
          data: {
            id: spinFixedCost.id,
            commonPoyDenier: values.commonPoyDenier,
            poyProduction: values.poyProduction,
            spinPowerMonth: values.spinPowerMonth,
            spinManpowerMonth: values.spinManpowerMonth,
            spinOverheadsMonth: values.spinOverheadsMonth,
            spinConssprsMonth: values.spinConssprsMonth,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          period: values.period,
          commonPoyDenier: values.commonPoyDenier,
          poyProduction: values.poyProduction,
          spinPowerMonth: values.spinPowerMonth,
          spinManpowerMonth: values.spinManpowerMonth,
          spinOverheadsMonth: values.spinOverheadsMonth,
          spinConssprsMonth: values.spinConssprsMonth,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save Spin Fixed Cost:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Spin Fixed Cost" : "Add New Spin Fixed Cost"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the monthly POY spinning fixed-cost pool. The period cannot be changed."
              : "Create the monthly POY spinning fixed-cost pool for a period. Only one row may exist per period — if the period already exists, edit that row instead."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                  <FormControl>
                    {/* Month picker shows "2026-04"; the stored value stays raw YYYYMM. */}
                    <Input
                      type="month"
                      value={periodToMonthInput(field.value || "")}
                      onChange={(e) => field.onChange(monthInputToPeriod(e.target.value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      disabled={isEditing || isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEditing
                      ? `${formatPeriod(field.value || "")} — the period is fixed once the row exists.`
                      : "Pick the costing month. One row per period; stored as YYYYMM."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="commonPoyDenier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Common POY Denier</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>Must be greater than 0 (divisor).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poyProduction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POY Production</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>Must be greater than 0 (divisor).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {MONTHLY_FIELDS.map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Deactivating removes this pool from the calc engine. It is refused when no
                        other pool row would remain.
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
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
