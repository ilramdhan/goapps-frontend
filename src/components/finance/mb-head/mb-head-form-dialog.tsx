"use client"

import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MachineCombobox } from "@/components/finance/comboboxes/machine-combobox"

import type { MBHead } from "@/types/finance/mb-head"
import { MAX_MB_HEAD_CHILD_SHADES, normalizeMBHeadShades } from "@/types/finance/mb-head"
import { MB_PARAM_CODE_NO_OF_PROCESS } from "@/types/finance/mb-param"
import { useCreateMBHead, useMBHead, useUpdateMBHead } from "@/hooks/finance/use-mb-head"
import { useMbParamOptions } from "@/hooks/finance/use-mb-param"
import { ApiError } from "@/lib/api"
import { formatValidationErrors } from "@/lib/hooks"

// ============================================================================
// Schema helpers
//
// Numeric inputs are held as strings because `<Input type="number">` writes a
// string back through react-hook-form. Validating the string (instead of
// coercing early) keeps "" distinguishable from 0, so a blank required field
// reports "is required" rather than silently passing as zero.
// ============================================================================

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)
}

interface NumberRules {
  integer?: boolean
  /** Value must be strictly greater than this. */
  greaterThan?: number
  min?: number
  max?: number
}

function checkNumber(label: string, value: string, rules: NumberRules, ctx: z.RefinementCtx) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({ code: "custom", message: `${label} must be a number` })
    return
  }
  if (rules.integer && !Number.isInteger(parsed)) {
    ctx.addIssue({ code: "custom", message: `${label} must be a whole number` })
  }
  if (rules.greaterThan !== undefined && parsed <= rules.greaterThan) {
    ctx.addIssue({ code: "custom", message: `${label} must be greater than ${rules.greaterThan}` })
  }
  if (rules.min !== undefined && parsed < rules.min) {
    ctx.addIssue({ code: "custom", message: `${label} must be at least ${rules.min}` })
  }
  if (rules.max !== undefined && parsed > rules.max) {
    ctx.addIssue({ code: "custom", message: `${label} must be at most ${rules.max}` })
  }
}

function requiredNumberText(label: string, rules: NumberRules) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .superRefine((value, ctx) => checkNumber(label, value, rules, ctx))
}

function optionalNumberText(label: string, rules: NumberRules) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return
      checkNumber(label, value, rules, ctx)
    })
}

// ============================================================================
// Schema
// ============================================================================

const shadeSchema = z.object({
  mbhsShadeCode: requiredText("Shade code", 20),
  mbhsShadeName: requiredText("Shade name", 100),
})

const formSchema = z
  .object({
    mbhMbCosting: requiredText("MB Costing code", 50),
    mbhOracleSysId: z.string().max(100).optional(),

    // The 11 required recipe fields.
    mbhMgtName: requiredText("MB Name", 100),
    mbhDevCode: requiredText("Development No", 50),
    mbhVsNumber: requiredText("VS Number", 50),
    mbhNoOfProcess: z.string().trim().min(1, "No of Process is required").max(10),
    mbhShadeCode: requiredText("Shade Code", 20),
    mbhShadeName: requiredText("Shade Name", 100),
    mbhDenier: requiredNumberText("POY Denier", { greaterThan: 0 }),
    mbhFilament: requiredNumberText("POY Filament", { integer: true, greaterThan: 0 }),
    mbhCrossSection: requiredText("Cross Section", 20),
    mbhLdrPrsn: requiredNumberText("LDR %", { min: 0, max: 100 }),
    mbhFinalProduct: requiredText("Final Product", 200),

    // Optional / non-recipe fields.
    mbhDozing: optionalNumberText("Dozing %", { min: 0, max: 100 }),
    mbhCheckStatus: z.string().max(50).optional(),
    mbhStatus: z.string().max(100).optional(),
    mbhCode: z.string().max(100).optional(),
    mbhLustureCode: z.string().max(10).optional(),
    mbhMachineId: z.string().optional(),
    mbhIsBoughtout: z.boolean(),
    mbhIsActive: z.boolean(),

    // Additional shades beyond the header shade (#1). At most 2.
    shades: z
      .array(shadeSchema)
      .max(
        MAX_MB_HEAD_CHILD_SHADES,
        `At most ${MAX_MB_HEAD_CHILD_SHADES} additional shades are allowed`
      ),
  })
  .superRefine((values, ctx) => {
    // A child shade code must not repeat the header shade code or a sibling.
    // Case-sensitive, matching the backend's Entity.checkShadeCode rule (spec §3.3).
    const headerCode = values.mbhShadeCode.trim()
    const seen = new Map<string, number>()

    values.shades.forEach((shade, index) => {
      const code = shade.mbhsShadeCode.trim()
      if (!code) return

      if (code === headerCode) {
        ctx.addIssue({
          code: "custom",
          path: ["shades", index, "mbhsShadeCode"],
          message: "Shade code already used by the header shade",
        })
        return
      }
      if (seen.has(code)) {
        ctx.addIssue({
          code: "custom",
          path: ["shades", index, "mbhsShadeCode"],
          message: "Shade code is already used by another additional shade",
        })
        return
      }
      seen.set(code, index)
    })
  })

type FormValues = z.infer<typeof formSchema>

const EMPTY_FORM_VALUES: FormValues = {
  mbhMbCosting: "",
  mbhOracleSysId: "",
  mbhMgtName: "",
  mbhDevCode: "",
  mbhVsNumber: "",
  mbhNoOfProcess: "",
  mbhShadeCode: "",
  mbhShadeName: "",
  mbhDenier: "",
  mbhFilament: "",
  mbhCrossSection: "",
  mbhLdrPrsn: "",
  mbhFinalProduct: "",
  mbhDozing: "",
  mbhCheckStatus: "",
  mbhStatus: "",
  mbhCode: "",
  mbhLustureCode: "",
  mbhMachineId: "",
  mbhIsBoughtout: false,
  mbhIsActive: true,
  shades: [],
}

/**
 * Backend field-level validation errors arrive keyed by the proto/DB column
 * name. Map them onto the matching form field so the message lands on the
 * input instead of only in a toast.
 */
const SERVER_FIELD_MAP: Record<string, keyof FormValues> = {
  mbh_mb_costing: "mbhMbCosting",
  mbh_mgt_name: "mbhMgtName",
  mbh_dev_code: "mbhDevCode",
  mbh_vs_number: "mbhVsNumber",
  mbh_no_of_process: "mbhNoOfProcess",
  mbh_shade_code: "mbhShadeCode",
  mbh_shade_name: "mbhShadeName",
  mbh_denier: "mbhDenier",
  mbh_filament: "mbhFilament",
  mbh_cross_section: "mbhCrossSection",
  mbh_ldr_prsn: "mbhLdrPrsn",
  mbh_final_product: "mbhFinalProduct",
}

function numText(value: number | string | undefined | null): string {
  return value === undefined || value === null || value === "" ? "" : String(value)
}

interface MBHeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbHead?: MBHead | null
  onSuccess?: () => void
}

export function MBHeadFormDialog({ open, onOpenChange, mbHead, onSuccess }: MBHeadFormDialogProps) {
  const isEditing = !!mbHead
  const createMutation = useCreateMBHead()
  const updateMutation = useUpdateMBHead()

  // The list response does NOT hydrate child shades — only GetMBHead does.
  // Since save is replace-on-send, prefilling from the list entity would post
  // an empty `shades` array and soft-delete the user's children. Fetch the
  // detail and prefill from it.
  const detailQuery = useMBHead(open && mbHead ? mbHead.mbhId : "")
  const detail = detailQuery.data?.data ?? null
  const isDetailLoading = isEditing && detailQuery.isLoading

  const {
    options: noOfProcessOptions,
    isLoading: isOptionsLoading,
    isError: isOptionsError,
  } = useMbParamOptions(MB_PARAM_CODE_NO_OF_PROCESS)
  const hasNoOfProcessOptions = noOfProcessOptions.length > 0

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: EMPTY_FORM_VALUES,
  })

  const { fields: shadeFields, append: appendShade, remove: removeShade } = useFieldArray({
    control: form.control,
    name: "shades",
  })

  useEffect(() => {
    if (!open) return

    // Prefer the detail payload (carries `shades`); fall back to the list row
    // only until the detail resolves.
    const source = detail ?? mbHead

    if (!source) {
      form.reset(EMPTY_FORM_VALUES)
      return
    }

    form.reset({
      mbhMbCosting: source.mbhMbCosting || "",
      mbhOracleSysId: source.mbhOracleSysId || "",
      mbhMgtName: source.mbhMgtName || "",
      mbhDevCode: source.devCode || "",
      mbhVsNumber: source.mbhVsNumber || "",
      mbhNoOfProcess: source.mbhNoOfProcess || "",
      mbhShadeCode: source.shadeCode || "",
      mbhShadeName: source.shadeName || "",
      mbhDenier: numText(source.mbhDenier),
      mbhFilament: numText(source.mbhFilament),
      mbhCrossSection: source.crossSection || "",
      mbhLdrPrsn: numText(source.mbhLdrPrsn),
      mbhFinalProduct: source.mbhFinalProduct || "",
      mbhDozing: numText(source.mbhDozing),
      mbhCheckStatus: source.mbhCheckStatus || "",
      mbhStatus: source.mbhStatus || "",
      mbhCode: source.mbhCode || "",
      mbhLustureCode: source.lustureCode || "",
      mbhMachineId: source.machineId || "",
      mbhIsBoughtout: source.isBoughtout ?? false,
      mbhIsActive: source.mbhIsActive ?? true,
      shades: normalizeMBHeadShades(source.shades).map((shade) => ({
        mbhsShadeCode: shade.shadeCode,
        mbhsShadeName: shade.shadeName,
      })),
    })
  }, [open, mbHead, detail, form])

  const applyServerFieldErrors = (error: unknown): void => {
    if (!(error instanceof ApiError) || error.validationErrors.length === 0) return
    const fieldErrors = formatValidationErrors(error)
    for (const [rawField, message] of Object.entries(fieldErrors)) {
      const target = SERVER_FIELD_MAP[rawField]
      if (target) {
        form.setError(target, { type: "server", message })
      }
    }
  }

  const onSubmit = async (values: FormValues) => {
    // Header shade is #1; children are 2 and 3.
    const shades = values.shades.map((shade, index) => ({
      mbhsSeqNo: index + 2,
      mbhsShadeCode: shade.mbhsShadeCode.trim(),
      mbhsShadeName: shade.mbhsShadeName.trim(),
    }))

    const required = {
      mbhMgtName: values.mbhMgtName.trim(),
      mbhDevCode: values.mbhDevCode.trim(),
      mbhVsNumber: values.mbhVsNumber.trim(),
      mbhNoOfProcess: values.mbhNoOfProcess.trim(),
      mbhShadeCode: values.mbhShadeCode.trim(),
      mbhShadeName: values.mbhShadeName.trim(),
      mbhDenier: Number(values.mbhDenier),
      mbhFilament: Number(values.mbhFilament),
      mbhCrossSection: values.mbhCrossSection.trim(),
      mbhLdrPrsn: Number(values.mbhLdrPrsn),
      mbhFinalProduct: values.mbhFinalProduct.trim(),
      shades,
    }

    const optional = {
      mbhDozing: values.mbhDozing === "" ? undefined : Number(values.mbhDozing),
      mbhCheckStatus: values.mbhCheckStatus || undefined,
      mbhStatus: values.mbhStatus || undefined,
      mbhCode: values.mbhCode || undefined,
      mbhLustureCode: values.mbhLustureCode || undefined,
      mbhMachineId: values.mbhMachineId || undefined,
    }

    try {
      if (isEditing && mbHead) {
        await updateMutation.mutateAsync({
          id: mbHead.mbhId,
          data: {
            mbhId: mbHead.mbhId,
            mbhMbCosting: values.mbhMbCosting,
            ...required,
            ...optional,
            mbhIsActive: values.mbhIsActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          mbhMbCosting: values.mbhMbCosting,
          mbhOracleSysId: values.mbhOracleSysId || undefined,
          mbhIsBoughtout: values.mbhIsBoughtout,
          ...required,
          ...optional,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      // Toast is raised by the hook; surface field-level errors on the inputs.
      applyServerFieldErrors(error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const canAddShade = shadeFields.length < MAX_MB_HEAD_CHILD_SHADES

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[640px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit MB Head" : "Add MB Head"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update MB Head details." : "Create a new MB Head record."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
          <ScrollableDialogBody className="space-y-4">
            <FormField
              control={form.control}
              name="mbhMbCosting"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MB Costing Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="MBH-2024-001" disabled={isEditing || isPending} />
                  </FormControl>
                  <FormDescription>Unique batch cost identifier</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mbhOracleSysId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oracle SYS ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" disabled={isEditing || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbhMgtName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MB Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Management display name" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbhDenier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POY Denier <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="e.g. 167" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbhFilament"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>POY Filament <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="1" min="1" placeholder="e.g. 36" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mbhDozing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dozing %</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" max="100" placeholder="Optional" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Oracle Data */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Oracle Data</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mbhCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhCheckStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check Status <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhLdrPrsn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LDR % <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.0001" min="0" max="100" placeholder="0 - 100" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhFinalProduct"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Final Product <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Final product description" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Recipe Identity */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Recipe Identity</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mbhDevCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Development No <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Unique development number" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhVsNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VS Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Unique VS number" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhNoOfProcess"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No of Process <span className="text-destructive">*</span></FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending || isOptionsLoading || !hasNoOfProcessOptions}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                isOptionsLoading
                                  ? "Loading..."
                                  : isOptionsError
                                    ? "Failed to load options"
                                    : !hasNoOfProcessOptions
                                      ? "No options configured"
                                      : "Select"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {noOfProcessOptions.map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.code} — {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isOptionsError && (
                        <FormDescription className="text-destructive">
                          Could not load No of Process options. Try reopening this dialog.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhLustureCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lusture Code <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhShadeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade Code <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Primary shade code" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhShadeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Primary shade name" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhCrossSection"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Cross Section <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cross-section descriptor" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhMachineId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Machine</FormLabel>
                      <FormControl>
                        <MachineCombobox
                          value={field.value}
                          onChange={(machineId) => field.onChange(machineId)}
                          mcTypeFilter="MB"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>Resolves the MACHINE_MB_FIXED_TOTAL cost parameter.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional shades — the header shade above is #1 */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Additional Shades</p>
                    <p className="text-xs text-muted-foreground">
                      Optional. Up to {MAX_MB_HEAD_CHILD_SHADES} extra shade codes sharing this recipe.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canAddShade || isPending || isDetailLoading}
                    onClick={() => appendShade({ mbhsShadeCode: "", mbhsShadeName: "" })}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add shade
                  </Button>
                </div>

                {shadeFields.length === 0 && (
                  <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                    No additional shades.
                  </p>
                )}

                {shadeFields.map((row, index) => (
                  <div key={row.id} className="flex items-start gap-2 rounded-md border p-3">
                    <span className="mt-8 text-xs text-muted-foreground">#{index + 2}</span>
                    <div className="grid flex-1 grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`shades.${index}.mbhsShadeCode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shade Code <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Shade code" disabled={isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`shades.${index}.mbhsShadeName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shade Name <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Shade name" disabled={isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6 h-8 w-8 shrink-0"
                      disabled={isPending}
                      onClick={() => removeShade(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove shade {index + 2}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="mbhIsBoughtout"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Bought-out</FormLabel>
                    <FormDescription>
                      Immutable after creation — indicates the MB is sourced externally rather than mixed in-house.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isEditing || isPending} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="mbhIsActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Inactive MB Heads are excluded from costing.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

          </ScrollableDialogBody>
          <ScrollableDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isDetailLoading}>
                {(isPending || isDetailLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
          </ScrollableDialogFooter>
          </form>
        </Form>
      </ScrollableDialogContent>
    </Dialog>
  )
}
