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

import type { BoxBobbinCost } from "@/types/finance/box-bobbin-cost"
import {
  useCreateBoxBobbinCost,
  useUpdateBoxBobbinCost,
} from "@/hooks/finance/use-box-bobbin-cost"

// `bbcCode` is the primary key: editable only at creation time. The field is
// rendered `disabled` on update, and its value is intentionally excluded
// from the update mutation payload below (see onSubmit) — so on update this
// schema must not re-validate the format of pre-existing/legacy codes.
const bbcCodeFormatSchema = z
  .string()
  .min(1, "Code is required")
  .max(50, "Code must be at most 50 characters")
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Code must start with uppercase letter and contain only uppercase letters, numbers, and underscores"
  )

const sharedBoxBobbinCostFields = {
  bbcName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  bbcType: z.string().min(1, "Type is required").max(20),
  noOfBob: z.coerce.number().int().min(1, "Must be at least 1"),
  notes: z.string().max(1000).optional(),
  isActive: z.boolean(),
  bbnReuse:     z.coerce.number().min(0).optional().nullable(),
  bbnReuseVal:  z.coerce.number().min(0).optional().nullable(),
  boxReuse:     z.coerce.number().min(0).optional().nullable(),
  boxReuseVal:  z.coerce.number().min(0).optional().nullable(),
  boxCost:      z.coerce.number().min(0).optional().nullable(),
  bobinCost:    z.coerce.number().min(0).optional().nullable(),
  boxCostVal:   z.coerce.number().min(0).optional().nullable(),
  bobinCostVal: z.coerce.number().min(0).optional().nullable(),
}

// Create: bbcCode is user-entered, so the strict format rule still applies.
const createFormSchema = z.object({
  bbcCode: bbcCodeFormatSchema,
  ...sharedBoxBobbinCostFields,
})

// Update: bbcCode is read-only/disabled and never sent to the API (see
// onSubmit), so it must not be re-validated against the create-time regex —
// otherwise saving legacy data that predates the format rule would be
// blocked. Still required as a non-empty string so the form/type stays sane.
const updateFormSchema = z.object({
  bbcCode: z.string().min(1),
  ...sharedBoxBobbinCostFields,
})

type FormValues = z.infer<typeof createFormSchema>

interface BoxBobbinCostFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boxBobbinCost?: BoxBobbinCost | null
  onSuccess?: () => void
}

export function BoxBobbinCostFormDialog({
  open,
  onOpenChange,
  boxBobbinCost,
  onSuccess,
}: BoxBobbinCostFormDialogProps) {
  const isEditing = !!boxBobbinCost
  const createMutation = useCreateBoxBobbinCost()
  const updateMutation = useUpdateBoxBobbinCost()

  const form = useForm<FormValues>({
    // Resolver is re-evaluated every render, so switching schema when
    // `isEditing` flips picks up the right rules immediately.
    resolver: zodResolver(isEditing ? updateFormSchema : createFormSchema) as never,
    defaultValues: {
      bbcCode: "",
      bbcName: "",
      bbcType: "",
      noOfBob: 24,
      notes: "",
      isActive: true,
      bbnReuse:     null,
      bbnReuseVal:  null,
      boxReuse:     null,
      boxReuseVal:  null,
      boxCost:      null,
      bobinCost:    null,
      boxCostVal:   null,
      bobinCostVal: null,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        boxBobbinCost
          ? {
              bbcCode:      boxBobbinCost.bbcCode || "",
              bbcName:      boxBobbinCost.bbcName || "",
              bbcType:      boxBobbinCost.bbcType || "",
              noOfBob:      boxBobbinCost.noOfBob ?? 24,
              notes:        boxBobbinCost.notes || "",
              isActive:     boxBobbinCost.isActive ?? true,
              bbnReuse:     boxBobbinCost.bbnReuse ?? null,
              bbnReuseVal:  boxBobbinCost.bbnReuseVal ?? null,
              boxReuse:     boxBobbinCost.boxReuse ?? null,
              boxReuseVal:  boxBobbinCost.boxReuseVal ?? null,
              boxCost:      boxBobbinCost.boxCost ?? null,
              bobinCost:    boxBobbinCost.bobinCost ?? null,
              boxCostVal:   boxBobbinCost.boxCostVal ?? null,
              bobinCostVal: boxBobbinCost.bobinCostVal ?? null,
            }
          : { bbcCode: "", bbcName: "", bbcType: "", noOfBob: 24, notes: "", isActive: true, bbnReuse: null, bbnReuseVal: null, boxReuse: null, boxReuseVal: null, boxCost: null, bobinCost: null, boxCostVal: null, bobinCostVal: null }
      )
    }
  }, [open, boxBobbinCost, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && boxBobbinCost) {
        await updateMutation.mutateAsync({
          id: boxBobbinCost.bbcId,
          data: {
            bbcId:        boxBobbinCost.bbcId,
            bbcName:      values.bbcName,
            bbcType:      values.bbcType,
            noOfBob:      values.noOfBob,
            notes:        values.notes || "",
            isActive:     values.isActive,
            bbnReuse:     values.bbnReuse ?? undefined,
            bbnReuseVal:  values.bbnReuseVal ?? undefined,
            boxReuse:     values.boxReuse ?? undefined,
            boxReuseVal:  values.boxReuseVal ?? undefined,
            boxCost:      values.boxCost ?? undefined,
            bobinCost:    values.bobinCost ?? undefined,
            boxCostVal:   values.boxCostVal ?? undefined,
            bobinCostVal: values.bobinCostVal ?? undefined,
          },
        })
      } else {
        await createMutation.mutateAsync({
          bbcCode:      values.bbcCode,
          bbcName:      values.bbcName,
          bbcType:      values.bbcType,
          noOfBob:      values.noOfBob,
          notes:        values.notes || "",
          bbnReuse:     values.bbnReuse ?? undefined,
          bbnReuseVal:  values.bbnReuseVal ?? undefined,
          boxReuse:     values.boxReuse ?? undefined,
          boxReuseVal:  values.boxReuseVal ?? undefined,
          boxCost:      values.boxCost ?? undefined,
          bobinCost:    values.bobinCost ?? undefined,
          boxCostVal:   values.boxCostVal ?? undefined,
          bobinCostVal: values.bobinCostVal ?? undefined,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Box Bobbin Cost" : "Add New Box Bobbin Cost"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the box bobbin cost details. Code cannot be changed."
              : "Create a new box bobbin cost record."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bbcCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., BBC001"
                      {...field}
                      value={field.value || ""}
                      disabled={isEditing || isPending}
                      className="uppercase"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>Unique code (uppercase, starts with letter)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bbcName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Box Bobbin Standard"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bbcType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., CAPTIVE"
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
                name="noOfBob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. Bobbins</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Optional"
                        {...field}
                        value={field.value}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Rates &amp; Reuse</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bbnReuse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bobbin Reuse Count <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bbnReuseVal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bobbin Reuse Count VAL <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boxReuse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Box Reuse Count <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boxReuseVal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Box Reuse Count VAL <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boxCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Box Rate MKT (USD) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bobinCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bobbin Rate MKT (USD) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boxCostVal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Box Rate VAL (USD) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bobinCostVal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bobbin Rate VAL (USD) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional notes"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
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
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Inactive records will not be available for selection
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
