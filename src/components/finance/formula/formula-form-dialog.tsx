"use client"

import { useEffect, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Search, X } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  type Formula,
  FormulaType,
  FORMULA_TYPE_FORM_OPTIONS,
} from "@/types/finance/formula"
import { ActiveFilter } from "@/types/finance/uom"
import { ParamCategory } from "@/types/finance/parameter"
import { useCreateFormula, useUpdateFormula, useFormula } from "@/hooks/finance/use-formula"
import { useParameters } from "@/hooks/finance/use-parameter"

interface FormulaFormValues {
  formulaCode: string
  formulaName: string
  formulaType: number
  expression: string
  resultParamId: string
  inputParamIds: string[]
  description: string
  isActive: boolean
}

const validTypeValues = [
  FormulaType.FORMULA_TYPE_CALCULATION,
  FormulaType.FORMULA_TYPE_SQL_QUERY,
  FormulaType.FORMULA_TYPE_CONSTANT,
  FormulaType.FORMULA_TYPE_CONDITIONAL,
  FormulaType.FORMULA_TYPE_LOOKUP,
  FormulaType.FORMULA_TYPE_RM_LOOKUP,
  FormulaType.FORMULA_TYPE_FROM_MARKETING,
  FormulaType.FORMULA_TYPE_INTERMINGLING,
  FormulaType.FORMULA_TYPE_SNAPSHOT,
  FormulaType.FORMULA_TYPE_PENDING,
  FormulaType.FORMULA_TYPE_INITIAL_VALUE,
]

const formulaFormSchema = z.object({
  formulaCode: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be at most 50 characters")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Code must start with uppercase letter and contain only uppercase letters, numbers, and underscores"
    ),
  formulaName: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be at most 200 characters"),
  formulaType: z
    .number()
    .refine(
      (val) => validTypeValues.includes(val),
      "Please select a valid formula type"
    ),
  expression: z
    .string()
    .min(1, "Expression is required")
    .max(5000, "Expression must be at most 5000 characters"),
  resultParamId: z
    .string()
    .min(1, "Result parameter is required"),
  inputParamIds: z.array(z.string()),
  description: z.string().max(1000, "Description must be at most 1000 characters"),
  isActive: z.boolean(),
}).superRefine((data, ctx) => {
  if (
    data.formulaType === FormulaType.FORMULA_TYPE_CALCULATION &&
    data.inputParamIds.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one input parameter is required for CALCULATION type",
      path: ["inputParamIds"],
    })
  }
  // Prevent self-reference: input param cannot be the same as result param
  if (
    data.resultParamId &&
    data.inputParamIds.includes(data.resultParamId)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Input parameters cannot include the result parameter (circular reference)",
      path: ["inputParamIds"],
    })
  }
})

interface FormulaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formula?: Formula | null
  onSuccess?: () => void
}

export function FormulaFormDialog({
  open,
  onOpenChange,
  formula,
  onSuccess,
}: FormulaFormDialogProps) {
  const isEditing = !!formula
  const createMutation = useCreateFormula()
  const updateMutation = useUpdateFormula()
  const [inputParamSearch, setInputParamSearch] = useState("")

  // Fetch full formula data when editing (list may not include inputParams)
  const { data: fullFormulaResult } = useFormula(
    isEditing && open ? formula.formulaId : ""
  )
  const fullFormula = fullFormulaResult?.data ?? null

  // Fetch CALCULATED params — these are always valid result params
  const { data: calculatedParamData } = useParameters({
    page: 1,
    pageSize: 200,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
    paramCategory: ParamCategory.PARAM_CATEGORY_CALCULATED,
    sortBy: "code",
    sortOrder: "asc",
  })

  // Fetch INPUT + RATE params for input parameter selection
  const { data: inputParamData } = useParameters({
    page: 1,
    pageSize: 200,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
    paramCategory: ParamCategory.PARAM_CATEGORY_INPUT,
    sortBy: "code",
    sortOrder: "asc",
  })

  const { data: rateParamData } = useParameters({
    page: 1,
    pageSize: 200,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
    paramCategory: ParamCategory.PARAM_CATEGORY_RATE,
    sortBy: "code",
    sortOrder: "asc",
  })

  // MASTER_LOOKUP params are legitimate formula inputs (e.g. F_YARN_VB1_LOSS
  // consumes CHANGE_OVER_QLTY_LOSS and VOLUME_BUCKET_1_QTY). Omitting this
  // category made those ids unresolvable, so they rendered as raw UUIDs and
  // could not be checklisted.
  const { data: masterLookupParamData } = useParameters({
    page: 1,
    pageSize: 200,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
    paramCategory: ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP,
    sortBy: "code",
    sortOrder: "asc",
  })

  // Result param pool = CALCULATED + INPUT. INPUT params can also be formula outputs
  // (e.g. AX_WT is INPUT category but is the result of F_YARN_AX_WT_FROM_MKT).
  // This matches Oracle's design where FROM_MARKETING formulas write to INPUT params.
  const resultParamPool = useMemo(() => [
    ...(calculatedParamData?.data || []),
    ...(inputParamData?.data || []),
  ].sort((a, b) => (a.paramCode || "").localeCompare(b.paramCode || "")), [calculatedParamData, inputParamData])

  const calculatedParams = useMemo(() => calculatedParamData?.data || [], [calculatedParamData])
  // Input picker = INPUT + RATE + CALCULATED + MASTER_LOOKUP. A CALCULATED param IS a valid
  // input to a *downstream* formula (formula chaining) — this is what enables
  // multi-level calc engines (e.g. COST_CONVERSION uses COST_ELEC + COST_LABOR_FULL).
  // MASTER_LOOKUP params are selector/auto-fill values that formulas also read.
  // We exclude the formula's own resultParamId at filter time to prevent self-loops.
  const inputPool = useMemo(() => [
    ...(inputParamData?.data || []),
    ...(rateParamData?.data || []),
    ...(calculatedParamData?.data || []),
    ...(masterLookupParamData?.data || []),
  ].sort((a, b) => (a.paramCode || "").localeCompare(b.paramCode || "")), [inputParamData, rateParamData, calculatedParamData, masterLookupParamData])

  const form = useForm<FormulaFormValues>({
    resolver: zodResolver(formulaFormSchema) as never,
    defaultValues: {
      formulaCode: "",
      formulaName: "",
      formulaType: FormulaType.FORMULA_TYPE_CALCULATION,
      expression: "",
      resultParamId: "",
      inputParamIds: [],
      description: "",
      isActive: true,
    },
  })

  // Watch formulaType to conditionally show input params section.
  const watchedFormulaType = form.watch("formulaType")
  const showInputParams = watchedFormulaType === FormulaType.FORMULA_TYPE_CALCULATION

  // Watch resultParamId to exclude it from the input picker (no self-loop).
  const watchedResultParamId = form.watch("resultParamId")
  const filteredInputParams = useMemo(() => {
    const pool = inputPool.filter((p) => p.paramId !== watchedResultParamId)
    if (!inputParamSearch) return pool
    const s = inputParamSearch.toLowerCase()
    return pool.filter((p) =>
      p.paramCode?.toLowerCase().includes(s) || p.paramName?.toLowerCase().includes(s)
    )
  }, [inputPool, inputParamSearch, watchedResultParamId])

  // Fallback label resolver for a selected param id. The picker pool is the
  // primary source; the formula's own inputParams carry paramCode/paramName
  // resolved by the backend join, so they cover any id outside the pool.
  // Never fall through to the bare UUID — show a readable placeholder instead.
  const resolveParamLabel = (paramId: string): string => {
    const fromPool = inputPool.find((p) => p.paramId === paramId)
    if (fromPool?.paramCode) return fromPool.paramCode
    const joined = (fullFormula || formula)?.inputParams?.find((p) => p.paramId === paramId)
    if (joined?.paramCode) return joined.paramCode
    if (joined?.paramName) return joined.paramName
    return "Unknown parameter"
  }

  // Populate form when dialog opens or fullFormula loads
  useEffect(() => {
    if (!open) return

    if (isEditing) {
      // Use fullFormula (fetched by ID) if available, fallback to list formula
      const src = fullFormula || formula
      if (!src) return
      const inputIds = fullFormula?.inputParams?.map((p) => p.paramId).filter(Boolean)
        || formula?.inputParams?.map((p) => p.paramId).filter(Boolean)
        || []
      form.reset({
        formulaCode: src.formulaCode || "",
        formulaName: src.formulaName || "",
        formulaType: src.formulaType,
        expression: src.expression || "",
        resultParamId: src.resultParamId || "",
        inputParamIds: inputIds,
        description: src.description || "",
        isActive: src.isActive ?? true,
      })
    } else {
      form.reset({
        formulaCode: "",
        formulaName: "",
        formulaType: FormulaType.FORMULA_TYPE_CALCULATION,
        expression: "",
        resultParamId: "",
        inputParamIds: [],
        description: "",
        isActive: true,
      })
    }
    setInputParamSearch("")
  }, [open, formula, fullFormula, form, isEditing])

  const onSubmit = async (values: FormulaFormValues) => {
    try {
      if (isEditing && formula) {
        await updateMutation.mutateAsync({
          id: formula.formulaId,
          data: {
            formulaId: formula.formulaId,
            formulaName: values.formulaName,
            formulaType: values.formulaType,
            expression: values.expression,
            resultParamId: values.resultParamId,
            inputParamIds: values.inputParamIds,
            description: values.description || "",
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          formulaCode: values.formulaCode,
          formulaName: values.formulaName,
          formulaType: values.formulaType,
          expression: values.expression,
          resultParamId: values.resultParamId,
          inputParamIds: values.inputParamIds,
          description: values.description || "",
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save formula:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const selectedInputIds = form.watch("inputParamIds")

  const toggleInputParam = (paramId: string) => {
    const current = form.getValues("inputParamIds")
    if (current.includes(paramId)) {
      form.setValue("inputParamIds", current.filter((id) => id !== paramId), { shouldValidate: true })
    } else {
      form.setValue("inputParamIds", [...current, paramId], { shouldValidate: true })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Formula" : "Add New Formula"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the formula details. Code cannot be changed."
              : "Create a new formula for costing calculations."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="formulaCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., COST_ELEC_STD"
                          {...field}
                          value={field.value || ""}
                          disabled={isEditing || isPending}
                          className="uppercase font-mono"
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formulaType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={String(field.value)}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FORMULA_TYPE_FORM_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="formulaName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Electricity Cost Standard"
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
                name="expression"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expression</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., DENIER * SPEED"
                        {...field}
                        value={field.value || ""}
                        disabled={isPending}
                        rows={3}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Use parameter codes in the expression. Spaces are allowed.
                      Examples: <code className="text-xs bg-muted px-1 rounded">DENIER * SPEED</code>,{" "}
                      <code className="text-xs bg-muted px-1 rounded">PRICE + (QTY * RATE)</code>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Result Parameter — CALCULATED + INPUT params (INPUT params can also be formula outputs) */}
              <FormField
                control={form.control}
                name="resultParamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result Parameter <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select output parameter" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resultParamPool.map((param) => (
                          <SelectItem key={param.paramId} value={param.paramId}>
                            <span className="font-mono text-xs">{param.paramCode}</span>
                            <span className="ml-1 text-xs text-muted-foreground">({String(param.paramCategory ?? "").replace("PARAM_CATEGORY_", "").toLowerCase()})</span>
                            <span className="ml-2 text-muted-foreground">— {param.paramName}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Calculated and Input category parameters can be formula outputs.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Input Parameters - only shown for CALCULATION type */}
              {showInputParams && (
                <FormField
                  control={form.control}
                  name="inputParamIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Input Parameters</FormLabel>
                      {selectedInputIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 pb-2">
                          {selectedInputIds.map((id) => {
                            return (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {resolveParamLabel(id)}
                                <button
                                  type="button"
                                  onClick={() => toggleInputParam(id)}
                                  className="ml-1 hover:text-destructive"
                                  disabled={isPending}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                      <div className="rounded-md border">
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <Input
                            placeholder="Search parameters..."
                            value={inputParamSearch}
                            onChange={(e) => setInputParamSearch(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={isPending}
                          />
                        </div>
                        <ScrollArea className="h-[150px]">
                          <div className="p-2 space-y-1">
                            {filteredInputParams.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No parameters found
                              </p>
                            ) : (
                              filteredInputParams.map((param) => (
                                <label
                                  key={param.paramId}
                                  className="flex items-center space-x-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selectedInputIds.includes(param.paramId)}
                                    onCheckedChange={() => toggleInputParam(param.paramId)}
                                    disabled={isPending}
                                  />
                                  <span className="font-mono text-xs">{param.paramCode}</span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    — {param.paramName}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                      <FormDescription>
                        Input, Rate, Calculated, and Master Lookup parameters are all available — pick the ones referenced in the expression above.
                        Calculated params enable formula chaining (e.g. COST_CONVERSION uses COST_LABOR_FULL which is itself produced by another formula).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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

              {isEditing && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Inactive formulas will not be used in calculations
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
            </div>

            <DialogFooter className="pt-4 border-t">
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
