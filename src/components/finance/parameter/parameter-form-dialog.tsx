"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

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

import type { Parameter } from "@/types/finance/parameter"
import {
  DataType,
  ParamCategory,
  DATA_TYPE_FORM_OPTIONS,
  PARAM_CATEGORY_FORM_OPTIONS,
} from "@/types/finance/parameter"
import { useCreateParameter, useUpdateParameter } from "@/hooks/finance/use-parameter"
import { useUOMs } from "@/hooks/finance/use-uom"
import { useDepartments } from "@/hooks/iam/use-departments"
import { ActiveFilter } from "@/types/finance/uom"
import { useLookupMasters, useLookupMasterColumns } from "@/hooks/finance/use-lookup-master"

interface ParameterFormValues {
  paramCode: string
  paramName: string
  paramShortName: string
  dataType: DataType
  paramCategory: ParamCategory
  uomId: string
  defaultValue: string
  minValue: string
  maxValue: string
  isActive: boolean
  ownerDepartment: string
  isRequiredForCosting: boolean
  isPeriodDependent: boolean
  lookupMasterCode: string
  lookupFillGroupCode: string
  lookupSourceColumn: string
  displayOrder: number
  displayGroup: string
  notes: string
  isApprovalVisible: boolean
  approvalDisplayOrder: number
}

const parameterFormSchema = z.object({
  paramCode: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be at most 20 characters")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Code must start with uppercase letter and contain only uppercase letters, numbers, and underscores"
    ),
  paramName: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be at most 200 characters"),
  paramShortName: z.string().max(50, "Short name must be at most 50 characters"),
  dataType: z.nativeEnum(DataType).refine(
    (val) => val !== DataType.DATA_TYPE_UNSPECIFIED,
    "Data type is required"
  ),
  paramCategory: z.nativeEnum(ParamCategory).refine(
    (val) => val !== ParamCategory.PARAM_CATEGORY_UNSPECIFIED,
    "Category is required"
  ),
  uomId: z.string(),
  defaultValue: z.string(),
  minValue: z.string(),
  maxValue: z.string(),
  isActive: z.boolean(),
  ownerDepartment: z.string().max(30),
  isRequiredForCosting: z.boolean(),
  isPeriodDependent: z.boolean(),
  lookupMasterCode: z.string().max(30),
  lookupFillGroupCode: z.string().max(20),
  lookupSourceColumn: z.string().max(50),
  displayOrder: z.coerce.number().int().gte(0),
  displayGroup: z.string().max(50),
  notes: z.string().max(500),
  isApprovalVisible: z.boolean(),
  approvalDisplayOrder: z.coerce.number().int().gte(0),
})

interface ParameterFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parameter?: Parameter | null
  onSuccess?: () => void
}

export function ParameterFormDialog({
  open,
  onOpenChange,
  parameter,
  onSuccess,
}: ParameterFormDialogProps) {
  const isEditing = !!parameter
  const createMutation = useCreateParameter()
  const updateMutation = useUpdateParameter()

  // Fetch active UOMs for the dropdown
  const { items: departments } = useDepartments()

  const { data: uomData } = useUOMs({
    page: 1,
    pageSize: 100,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
    sortBy: "code",
    sortOrder: "asc",
  })

  const form = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterFormSchema) as never,
    defaultValues: {
      paramCode: "",
      paramName: "",
      paramShortName: "",
      dataType: DataType.DATA_TYPE_NUMBER,
      paramCategory: ParamCategory.PARAM_CATEGORY_INPUT,
      uomId: "",
      defaultValue: "",
      minValue: "",
      maxValue: "",
      isActive: true,
      ownerDepartment: "",
      isRequiredForCosting: false,
      isPeriodDependent: false,
      lookupMasterCode: "",
      lookupFillGroupCode: "",
      lookupSourceColumn: "",
      displayOrder: 0,
      displayGroup: "",
      notes: "",
      isApprovalVisible: false,
      approvalDisplayOrder: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (parameter) {
        form.reset({
          paramCode: parameter.paramCode || "",
          paramName: parameter.paramName || "",
          paramShortName: parameter.paramShortName || "",
          dataType: parameter.dataType || DataType.DATA_TYPE_NUMBER,
          paramCategory: parameter.paramCategory || ParamCategory.PARAM_CATEGORY_INPUT,
          uomId: parameter.uomId || "",
          defaultValue: parameter.defaultValue || "",
          minValue: parameter.minValue || "",
          maxValue: parameter.maxValue || "",
          isActive: parameter.isActive ?? true,
          ownerDepartment: parameter.ownerDepartment || "",
          isRequiredForCosting: parameter.isRequiredForCosting ?? false,
          isPeriodDependent: parameter.isPeriodDependent ?? false,
          lookupMasterCode: parameter.lookupMasterCode || "",
          lookupFillGroupCode: parameter.lookupFillGroupCode || "__none__",
          lookupSourceColumn: parameter.lookupSourceColumn || "",
          displayOrder: parameter.displayOrder ?? 0,
          displayGroup: parameter.displayGroup || "",
          notes: parameter.notes || "",
          isApprovalVisible: parameter.isApprovalVisible ?? false,
          approvalDisplayOrder: parameter.approvalDisplayOrder ?? 0,
        })
      } else {
        form.reset({
          paramCode: "",
          paramName: "",
          paramShortName: "",
          dataType: DataType.DATA_TYPE_NUMBER,
          paramCategory: ParamCategory.PARAM_CATEGORY_INPUT,
          uomId: "",
          defaultValue: "",
          minValue: "",
          maxValue: "",
          isActive: true,
          ownerDepartment: "",
          isRequiredForCosting: false,
          isPeriodDependent: false,
          lookupMasterCode: "",
          lookupFillGroupCode: "",
          lookupSourceColumn: "",
          displayOrder: 0,
          displayGroup: "",
          notes: "",
          isApprovalVisible: false,
          approvalDisplayOrder: 0,
        })
      }
    }
  }, [open, parameter, form])

  const onSubmit = async (values: ParameterFormValues) => {
    try {
      if (isEditing && parameter) {
        await updateMutation.mutateAsync({
          id: parameter.paramId,
          data: {
            paramId: parameter.paramId,
            paramName: values.paramName,
            paramShortName: values.paramShortName,
            dataType: values.dataType,
            paramCategory: values.paramCategory,
            uomId: values.uomId || undefined,
            defaultValue: values.defaultValue || undefined,
            minValue: values.minValue || undefined,
            maxValue: values.maxValue || undefined,
            isActive: values.isActive,
            ownerDepartment: values.ownerDepartment,
            isRequiredForCosting: values.isRequiredForCosting,
            isPeriodDependent: values.isPeriodDependent,
            lookupMasterCode: values.lookupMasterCode,
            lookupFillGroupCode: values.lookupFillGroupCode === "__none__" ? undefined : (values.lookupFillGroupCode || undefined),
            lookupSourceColumn: values.lookupSourceColumn || undefined,
            displayOrder: values.displayOrder,
            displayGroup: values.displayGroup,
            notes: values.notes,
            isApprovalVisible: values.isApprovalVisible,
            approvalDisplayOrder: values.approvalDisplayOrder,
          },
        })
      } else {
        await createMutation.mutateAsync({
          paramCode: values.paramCode,
          paramName: values.paramName,
          paramShortName: values.paramShortName,
          dataType: values.dataType,
          paramCategory: values.paramCategory,
          uomId: values.uomId || "",
          defaultValue: values.defaultValue || "",
          minValue: values.minValue || "",
          maxValue: values.maxValue || "",
          ownerDepartment: values.ownerDepartment,
          isRequiredForCosting: values.isRequiredForCosting,
          isPeriodDependent: values.isPeriodDependent,
          lookupMasterCode: values.lookupMasterCode,
          lookupFillGroupCode: values.lookupFillGroupCode === "__none__" ? "" : values.lookupFillGroupCode,
          lookupSourceColumn: values.lookupSourceColumn,
          displayOrder: values.displayOrder,
          displayGroup: values.displayGroup,
          notes: values.notes,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save Parameter:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  // Lookup master registry
  const { data: lookupMasters = [] } = useLookupMasters(true)
  const watchedCategory = form.watch("paramCategory")
  const watchedFillGroup = form.watch("lookupFillGroupCode")
  const watchedIsApprovalVisible = form.watch("isApprovalVisible")

  // Fetch MASTER_LOOKUP trigger params for the fill-group combobox (child params only)
  const { data: triggerParams } = useQuery({
    queryKey: ["finance", "parameter", "list", "master-lookup-triggers"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/finance/parameters?paramCategory=${ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP}&pageSize=100`)
      if (!res.ok) return []
      // ListParametersResponse.data is repeated Parameter (direct array, not nested items)
      const json = await res.json() as { data?: Array<{ paramCode: string; paramName: string; lookupMasterCode: string }> | { items?: Array<{ paramCode: string; paramName: string; lookupMasterCode: string }> } }
      const data = json.data
      return Array.isArray(data) ? data : (data?.items ?? [])
    },
    staleTime: 60_000,
    enabled: watchedCategory !== ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP,
  })

  // Derive master code from selected trigger param for cascading source-column dropdown
  const masterCodeForColumns = useMemo(() => {
    if (!watchedFillGroup || watchedFillGroup === "__none__" || !triggerParams) return ""
    const trigger = triggerParams.find((p) => p.paramCode === watchedFillGroup)
    return trigger?.lookupMasterCode ?? ""
  }, [watchedFillGroup, triggerParams])

  const { data: sourceColumns } = useLookupMasterColumns(masterCodeForColumns || undefined)

  // Clear lookup master code when category changes away from MASTER_LOOKUP
  useEffect(() => {
    if (watchedCategory !== ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP) {
      form.setValue("lookupMasterCode", "")
    }
  }, [watchedCategory, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Parameter" : "Add New Parameter"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the parameter details. Code cannot be changed."
              : "Create a new parameter for costing calculations."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paramCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., SPEED, DENIER, ELEC_RATE"
                      {...field}
                      value={field.value || ""}
                      disabled={isEditing || isPending}
                      className="uppercase"
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Unique code (1-20 chars, uppercase, starts with letter)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="paramName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Speed, Denier"
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
                name="paramShortName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Spd, Den (optional)"
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dataType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Type</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={String(field.value)}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select data type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DATA_TYPE_FORM_OPTIONS.map((option) => (
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

              <FormField
                control={form.control}
                name="paramCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={String(field.value)}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PARAM_CATEGORY_FORM_OPTIONS.map((option) => (
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
              name="uomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UOM (Optional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                    value={field.value || "__none__"}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select UOM (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {(uomData?.data || []).map((uom) => (
                        <SelectItem key={uom.uomId} value={uom.uomId}>
                          {uom.uomCode} — {uom.uomName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Reference to a Unit of Measure (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="defaultValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 100.5"
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
                name="minValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 0"
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
                name="maxValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 9999"
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

            {/* ── Costing Metadata (Phase B product↔param binding) ─────────── */}
            <div className="border-t pt-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold">Costing Metadata</h4>
                <p className="text-xs text-muted-foreground">
                  Drives how this parameter appears on the per-product parameter form during
                  costing.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                <FormField
                  control={form.control}
                  name="ownerDepartment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Department</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                        value={field.value || "__none__"}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.code || d.name}>
                              {d.name}
                              {d.code && d.code !== d.name && ` (${d.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Pick from IAM master department.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Group</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Spec, Machine, Grade, Packing"
                          {...field}
                          value={field.value || ""}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Section heading shown on the per-product param form.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(Number(e.target.value || 0))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>Render order within the display group.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lookupMasterCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lookup Master</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        disabled={isPending || watchedCategory !== ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              watchedCategory === ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP
                                ? "Select a master table…"
                                : "Only for Master Lookup category"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lookupMasters.map((m) => (
                            <SelectItem key={m.lmCode} value={m.lmCode}>
                              {m.lmDisplayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        When set, the per-product form renders a combobox sourced from this master.
                        Only applicable for Master Lookup category params.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fill Group — only for child params (non-MASTER_LOOKUP) */}
                {watchedCategory !== ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP && (
                  <FormField
                    control={form.control}
                    name="lookupFillGroupCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fill Group (Parent Trigger)</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={(val) => {
                            field.onChange(val)
                            form.setValue("lookupSourceColumn", "")
                          }}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select trigger param (optional)…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {(triggerParams ?? []).map((p) => (
                              <SelectItem key={p.paramCode} value={p.paramCode}>
                                {p.paramCode} — {p.paramName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          If this param is auto-filled by a MASTER_LOOKUP trigger, select the trigger param here.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Source Column — cascades from fill group selection */}
                {watchedFillGroup && watchedFillGroup !== "__none__" && (
                  <FormField
                    control={form.control}
                    name="lookupSourceColumn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Column</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          disabled={isPending || !masterCodeForColumns}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={masterCodeForColumns ? "Select column…" : "Select fill group first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(sourceColumns ?? []).map((col) => (
                              <SelectItem key={col.lmcColumnName} value={col.lmcColumnName}>
                                {col.lmcDisplayName} ({col.lmcDataType.toLowerCase()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The column in the master table whose value will fill this param.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="mt-4 space-y-3">
                <FormField
                  control={form.control}
                  name="isRequiredForCosting"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Required for Costing</FormLabel>
                        <FormDescription>
                          Product cannot leave PARAMETER_PENDING until this param has a value.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPeriodDependent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Period-Dependent</FormLabel>
                        <FormDescription>
                          Value changes per period (Phase C). Leave OFF for static values stored in
                          cost_product_parameter.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isEditing && (
                  <>
                    <FormField
                      control={form.control}
                      name="isApprovalVisible"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Visible in Approval Summary</FormLabel>
                            <FormDescription>
                              Shown to the approver on the read-only review drawer before approving a
                              fill task.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              disabled={isPending}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {watchedIsApprovalVisible && (
                      <FormField
                        control={form.control}
                        name="approvalDisplayOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Approval Display Order</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                value={field.value ?? 0}
                                onChange={(e) => field.onChange(Number(e.target.value || 0))}
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormDescription>
                              Render order within the approval review drawer.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Formula hint or description (optional, max 500 chars)"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Free-text notes or formula hint. Pre-filled from Excel spec.
                  </FormDescription>
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
                        Inactive parameters will not be available for selection
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
