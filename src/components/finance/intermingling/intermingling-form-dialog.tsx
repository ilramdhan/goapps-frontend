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

import type { Intermingling } from "@/types/finance/intermingling"
import {
  useCreateIntermingling,
  useUpdateIntermingling,
} from "@/hooks/finance/use-intermingling"

// `intmCode` is the primary key: editable only at creation time. The field
// is rendered `disabled` on update, and its value is intentionally excluded
// from the update mutation payload below (see onSubmit) — so on update this
// schema must not re-validate the format of pre-existing/legacy codes.
const intmCodeFormatSchema = z
  .string()
  .min(1, "Code is required")
  .max(20, "Code must be at most 20 characters")
  .regex(/^[A-Z][A-Z0-9_]*$/, "Uppercase letters, digits, underscores only")

const sharedInterminglingFields = {
  intmName: z.string().min(1, "Name is required").max(100),
  intmCostPerKg: z.coerce.number().min(0, "Cost must not be negative"),
  notes: z.string().max(500).optional(),
  isActive: z.boolean(),
}

// Create: intmCode is user-entered, so the strict format rule still applies.
const createFormSchema = z.object({
  intmCode: intmCodeFormatSchema,
  ...sharedInterminglingFields,
})

// Update: intmCode is read-only/disabled and never sent to the API (see
// onSubmit), so it must not be re-validated against the create-time regex —
// otherwise saving legacy data that predates the format rule would be
// blocked. Still required as a non-empty string so the form/type stays sane.
const updateFormSchema = z.object({
  intmCode: z.string().min(1),
  ...sharedInterminglingFields,
})

type FormValues = z.infer<typeof createFormSchema>

interface InterminglingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intermingling?: Intermingling | null
  onSuccess?: () => void
}

export function InterminglingFormDialog({
  open,
  onOpenChange,
  intermingling,
  onSuccess,
}: InterminglingFormDialogProps) {
  const isEditing = !!intermingling
  const createMutation = useCreateIntermingling()
  const updateMutation = useUpdateIntermingling()

  const form = useForm<FormValues>({
    // Resolver is re-evaluated every render, so switching schema when
    // `isEditing` flips picks up the right rules immediately.
    resolver: zodResolver(isEditing ? updateFormSchema : createFormSchema) as never,
    defaultValues: { intmCode: "", intmName: "", intmCostPerKg: 0, notes: "", isActive: true },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        intermingling
          ? {
              intmCode: intermingling.intmCode,
              intmName: intermingling.intmName,
              intmCostPerKg: intermingling.intmCostPerKg ?? 0,
              notes: intermingling.notes || "",
              isActive: intermingling.isActive ?? true,
            }
          : { intmCode: "", intmName: "", intmCostPerKg: 0, notes: "", isActive: true }
      )
    }
  }, [open, intermingling, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && intermingling) {
        await updateMutation.mutateAsync({
          id: intermingling.intmId,
          data: {
            intmId: intermingling.intmId,
            intmName: values.intmName,
            intmCostPerKg: values.intmCostPerKg,
            notes: values.notes,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          intmCode: values.intmCode,
          intmName: values.intmName,
          intmCostPerKg: values.intmCostPerKg,
          notes: values.notes || "",
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // toast handled in hook
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Intermingling" : "Add Intermingling"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update intermingling details." : "Create a new intermingling record."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="intmCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., HIM"
                      disabled={isEditing || isPending}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>Unique code, max 20 chars (HIM, SIM, LIM…)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intmName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., High Intermingling" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intmCostPerKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost per kg (USD) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="any" min="0" placeholder="0.0000" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional notes" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Inactive records are excluded from costing.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
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
