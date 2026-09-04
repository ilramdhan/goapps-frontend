"use client"

// V2 RM Group form dialog. Aligns with the V2 business model:
//  - Marketing inputs (freight, anti-dumping %, duty %, transport rate, default value)
//  - Valuation flag (AUTO/CR/SR/PR/CL/SL/FL)
//  - Marketing flag (AUTO/SP/PP/FP)
//
// The legacy V1 flag fields (flagValuation/flagMarketing/flagSimulation =
// CONS/STORES/DEPT/PO_1..3/INIT) are kept on the backend for back-compat
// but are no longer exposed in the UI — they're sent as CONS defaults.

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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import type { RMGroupHead, UpdateRMGroupRequest } from "@/types/finance/rm-group"
import {
  RM_VALUATION_FLAG_OPTIONS,
  RM_MARKETING_FLAG_OPTIONS,
} from "@/types/finance/rm-group"
import {
  RMGroupFlag,
  RMValuationFlag,
  RMMarketingFlag,
} from "@/types/generated/finance/v1/rm_group"
import { useCreateRMGroup, useUpdateRMGroup } from "@/hooks/finance/use-rm-group"

// V2 form schema — combines basic identity + marketing inputs + V2 flags.
//
// Convention: percent fields (`costPercentage`, `marketingAntiDumpingPct`)
// are entered/displayed in WHOLE PERCENT in the form (e.g. user types "5"
// for 5%). The form converts to/from the decimal storage format used by
// backend + DB on submit/load via `pctFromDecimal` / `pctToDecimal`.
const groupFormSchema = z.object({
  groupCode: z.string().min(1, "Code is required").max(30, "Max 30 chars"),
  groupName: z.string().min(1, "Name is required").max(200, "Max 200 chars"),
  description: z.string().max(500, "Max 500 chars"),
  colourant: z.string().max(30).optional(),
  ciName: z.string().max(30).optional(),
  // Marketing duty in WHOLE PERCENT (UI). Stored as decimal in DB.
  costPercentage: z.coerce.number().min(0, "Must be >= 0"),
  // Marketing transport rate (per-kg overhead). Already a rate, no scale conv.
  costPerKg: z.coerce.number().min(0, "Must be >= 0"),
  // V2 marketing inputs.
  marketingFreightRate: z.coerce.number().nullable(),
  // Marketing anti-dumping in WHOLE PERCENT (UI). Stored as decimal in DB.
  marketingAntiDumpingPct: z.coerce.number().nullable(),
  marketingDefaultValue: z.coerce.number().nullable(),
  valuationFlag: z.nativeEnum(RMValuationFlag),
  marketingFlag: z.nativeEnum(RMMarketingFlag),
  isActive: z.boolean(),
})

/** Convert decimal-stored value (0.05) → whole-percent UI value (5). */
function pctFromDecimal(d: number | null | undefined): number | null {
  if (d === null || d === undefined) return null
  return Math.round(d * 100 * 1e6) / 1e6 // round at 6 decimals to kill float drift
}

/** Convert whole-percent UI value (5) → decimal storage value (0.05). */
function pctToDecimal(p: number | null | undefined): number | null {
  if (p === null || p === undefined) return null
  return Math.round((p / 100) * 1e8) / 1e8
}

type GroupFormValues = z.infer<typeof groupFormSchema>

const DEFAULT_VALUES: GroupFormValues = {
  groupCode: "",
  groupName: "",
  description: "",
  colourant: "",
  ciName: "",
  costPercentage: 0,
  costPerKg: 0,
  marketingFreightRate: null,
  marketingAntiDumpingPct: null,
  marketingDefaultValue: null,
  valuationFlag: RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED,
  marketingFlag: RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED,
  isActive: true,
}

interface GroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: RMGroupHead | null
  onSuccess?: (groupHeadId: string) => void
}

export function GroupFormDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: GroupFormDialogProps) {
  const isEditing = !!group
  const createMutation = useCreateRMGroup()
  const updateMutation = useUpdateRMGroup()

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema) as never,
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      if (group) {
        form.reset({
          groupCode: group.groupCode || "",
          groupName: group.groupName || "",
          description: group.description || "",
          colourant: group.colourant || "",
          ciName: group.ciName || "",
          costPercentage: pctFromDecimal(group.costPercentage) ?? 0,
          costPerKg: group.costPerKg ?? 0,
          marketingFreightRate: group.marketingFreightRate ?? null,
          marketingAntiDumpingPct: pctFromDecimal(group.marketingAntiDumpingPct),
          marketingDefaultValue: group.marketingDefaultValue ?? null,
          valuationFlag:
            (group.valuationFlag ?? RMValuationFlag.RM_VALUATION_FLAG_UNSPECIFIED) as RMValuationFlag,
          marketingFlag:
            (group.marketingFlag ?? RMMarketingFlag.RM_MARKETING_FLAG_UNSPECIFIED) as RMMarketingFlag,
          isActive: group.isActive ?? true,
        })
      } else {
        form.reset(DEFAULT_VALUES)
      }
    }
  }, [open, group, form])

  const onSubmit = async (values: GroupFormValues) => {
    // Convert percent UI → decimal storage before sending to backend.
    const costPercentageDecimal = pctToDecimal(values.costPercentage) ?? 0
    const antiDecimal = pctToDecimal(values.marketingAntiDumpingPct)
    try {
      if (isEditing && group) {
        const updateData: UpdateRMGroupRequest = {
          groupHeadId: group.groupHeadId,
          groupName: values.groupName,
          description: values.description || "",
          colourant: values.colourant || "",
          ciName: values.ciName || "",
          costPercentage: costPercentageDecimal,
          costPerKg: values.costPerKg,
          // Legacy V1 flags kept at CONS to satisfy backend constraint.
          flagValuation: RMGroupFlag.RM_GROUP_FLAG_CONS,
          flagMarketing: RMGroupFlag.RM_GROUP_FLAG_CONS,
          flagSimulation: RMGroupFlag.RM_GROUP_FLAG_CONS,
          isActive: values.isActive,
          // V2 marketing fields.
          marketingFreightRate: values.marketingFreightRate ?? undefined,
          marketingAntiDumpingPct: antiDecimal ?? undefined,
          marketingDefaultValue: values.marketingDefaultValue ?? undefined,
          valuationFlag: values.valuationFlag,
          marketingFlag: values.marketingFlag,
          // Clear flags so empty inputs become NULL on backend.
          clearMarketingFreightRate: values.marketingFreightRate === null,
          clearMarketingAntiDumpingPct: values.marketingAntiDumpingPct === null,
          clearMarketingDefaultValue: values.marketingDefaultValue === null,
          clearInitValValuation: true,
          clearInitValMarketing: true,
          clearInitValSimulation: true,
        }
        await updateMutation.mutateAsync({ id: group.groupHeadId, data: updateData })
        onOpenChange(false)
        onSuccess?.(group.groupHeadId)
      } else {
        const created = await createMutation.mutateAsync({
          groupCode: values.groupCode,
          groupName: values.groupName,
          description: values.description || "",
          colourant: values.colourant || "",
          ciName: values.ciName || "",
          costPercentage: costPercentageDecimal,
          costPerKg: values.costPerKg,
          marketingFreightRate: values.marketingFreightRate ?? undefined,
          marketingAntiDumpingPct: antiDecimal ?? undefined,
          marketingDefaultValue: values.marketingDefaultValue ?? undefined,
          valuationFlag: values.valuationFlag,
          marketingFlag: values.marketingFlag,
        })

        const newId = created?.groupHeadId
        if (!newId) throw new Error("Create succeeded but no group ID returned")

        onOpenChange(false)
        onSuccess?.(newId)
      }
    } catch (error) {
      console.error("Failed to save RM Group:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>{isEditing ? "Edit RM Group" : "Add New RM Group"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the RM group configuration. Code cannot be changed."
              : "Create a new RM group with V2 marketing inputs. Per-detail valuation inputs are configured per item after adding them."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form
              id="group-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="groupCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., GRP-CHIPS"
                          {...field}
                          value={field.value || ""}
                          disabled={isEditing || isPending}
                          className="uppercase font-mono"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>Uppercase, digits, hyphens, spaces</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="groupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Chips Group A"
                          {...field}
                          value={field.value || ""}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description..."
                        {...field}
                        value={field.value || ""}
                        disabled={isPending}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="colourant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colourant</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Colourant code"
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
                  name="ciName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CI Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="CI name"
                          {...field}
                          value={field.value || ""}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Marketing Inputs (V2) */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Marketing Inputs</h4>
                  <p className="text-xs text-muted-foreground">
                    Drives SP / PP / FP marketing projections. Empty values stay NULL.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="costPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marketing Duty %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 5"
                            {...field}
                            value={field.value ?? ""}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>Whole percent (5 = 5%)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="costPerKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marketing Transport Rate</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="0.89"
                            {...field}
                            value={field.value ?? ""}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>Per-kg overhead</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marketingFreightRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marketing Freight Rate</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="0.00"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? null : Number(e.target.value))
                            }
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>Added to base rate before duty/anti</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marketingAntiDumpingPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marketing Anti Dumping %</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 0"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? null : Number(e.target.value))
                            }
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>Whole percent</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marketingDefaultValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marketing Default Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="15.00"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? null : Number(e.target.value))
                            }
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>Drives FP projection</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* V2 Flags */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Selection Flags (V2)</h4>
                  <p className="text-xs text-muted-foreground">
                    AUTO uses cascade fallback (CL→SL→FL→PR for valuation, SP→PP→FP for marketing).
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="valuationFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valuation Flag</FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RM_VALUATION_FLAG_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
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
                    name="marketingFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marketing Flag</FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RM_MARKETING_FLAG_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Active toggle (edit only) */}
              {isEditing && (
                <>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <FormDescription>
                            Inactive groups are excluded from cost calculations
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
                </>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="group-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create & Go to Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
