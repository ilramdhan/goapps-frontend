"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

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

import type { Demand, CreateDemandRequest, UpdateDemandRequest } from "@/types/ppc/demand"
import {
  DemandType,
  DemandSubType,
  DemandSource,
  GradeReq,
  DEMAND_TYPE_OPTIONS,
  DEMAND_SUB_TYPE_OPTIONS,
  GRADE_REQ_OPTIONS,
  monthOfDate,
} from "@/types/ppc/common"
import { useCreateDemand, useUpdateDemand } from "@/hooks/ppc/use-demand"
import { ProductCombobox, CustomerCombobox } from "@/components/ppc/comboboxes"

const baseFormSchema = z.object({
  type: z.number(),
  subType: z.number(),
  // MTS and Sample demands are often raised before the finance product master
  // exists, so the product may be left blank and linked later. Contract demands
  // always come from a real order and must name their product up front.
  cpmProductSysId: z.string().regex(/^\d*$/, "Must be a numeric ID"),
  qtyOriginal: z
    .string()
    .min(1, "Quantity is required")
    .regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
  deadline: z.string().min(1, "Deadline is required"),
  gradeRequirement: z.number(),
  axMinPct: z.string(),
  amMaxPct: z.string(),
  contractNo: z.string(),
  customerId: z.string(),
  contractDate: z.string(),
  incoterm: z.string(),
  lcStatus: z.string(),
  stuffAdvanceNo: z.string(),
})

/**
 * The product is only writable at creation and, afterwards, through the row's
 * Link Product action (MapDemandProduct) — UpdateDemand cannot write it at all.
 * So the edit form drops the field, and with it this rule: enforcing it on edit
 * would block saving a contract demand that is still awaiting its product link
 * through a field the planner can no longer see.
 */
const createFormSchema = baseFormSchema.superRefine((values, ctx) => {
  if (values.type === DemandType.DEMAND_TYPE_CONTRACT && !values.cpmProductSysId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cpmProductSysId"],
      message: "Product is required for a contract demand",
    })
  }
})

type FormValues = z.infer<typeof baseFormSchema>

const DEFAULT_VALUES: FormValues = {
  type: DemandType.DEMAND_TYPE_CONTRACT,
  subType: DemandSubType.DEMAND_SUB_TYPE_UNSPECIFIED,
  cpmProductSysId: "",
  qtyOriginal: "",
  deadline: "",
  gradeRequirement: GradeReq.GRADE_REQ_AX_ONLY,
  axMinPct: "",
  amMaxPct: "",
  contractNo: "",
  customerId: "",
  contractDate: "",
  incoterm: "",
  lcStatus: "",
  stuffAdvanceNo: "",
}

interface DemandFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand?: Demand | null
  onSuccess?: () => void
}

export function DemandFormDialog({
  open,
  onOpenChange,
  demand,
  onSuccess,
}: DemandFormDialogProps) {
  const isEditing = !!demand
  const createMutation = useCreateDemand()
  const updateMutation = useUpdateDemand()

  const form = useForm<FormValues>({
    // The product rule is create-only; the edit form has no product field.
    resolver: zodResolver(isEditing ? baseFormSchema : createFormSchema) as never,
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) return
    if (demand) {
      form.reset({
        type: demand.type,
        subType: demand.subType,
        cpmProductSysId: demand.cpmProductSysId ? String(demand.cpmProductSysId) : "",
        qtyOriginal: demand.qtyOriginal || "",
        deadline: demand.deadline ? demand.deadline.slice(0, 10) : "",
        gradeRequirement: demand.gradeRequirement,
        axMinPct: demand.axMinPct || "",
        amMaxPct: demand.amMaxPct || "",
        contractNo: demand.contractNo || "",
        customerId: demand.customerId ? String(demand.customerId) : "",
        contractDate: demand.contractDate ? demand.contractDate.slice(0, 10) : "",
        incoterm: demand.incoterm || "",
        lcStatus: demand.lcStatus || "",
        stuffAdvanceNo: demand.stuffAdvanceNo || "",
      })
    } else {
      form.reset(DEFAULT_VALUES)
    }
  }, [open, demand, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && demand) {
        const data: UpdateDemandRequest = {
          demandId: demand.demandId,
          qtyOriginal: values.qtyOriginal,
          deadline: values.deadline,
          gradeRequirement: values.gradeRequirement,
          axMinPct: values.axMinPct || undefined,
          amMaxPct: values.amMaxPct || undefined,
          contractNo: values.contractNo || undefined,
          incoterm: values.incoterm || undefined,
          lcStatus: values.lcStatus || undefined,
          stuffAdvanceNo: values.stuffAdvanceNo || undefined,
        }
        await updateMutation.mutateAsync({ id: String(demand.demandId), data })
      } else {
        const data: CreateDemandRequest = {
          type: values.type,
          subType: values.subType,
          source: DemandSource.DEMAND_SOURCE_MANUAL,
          cpmProductSysId: values.cpmProductSysId
            ? Number(values.cpmProductSysId)
            : undefined,
          qtyOriginal: values.qtyOriginal,
          deadline: values.deadline,
          gradeRequirement: values.gradeRequirement,
          // Month is derived from the deadline; only carry-forward overrides it.
          monthOverride: false,
          axMinPct: values.axMinPct || undefined,
          amMaxPct: values.amMaxPct || undefined,
          contractNo: values.contractNo || undefined,
          customerId: values.customerId ? Number(values.customerId) : undefined,
          contractDate: values.contractDate || undefined,
          incoterm: values.incoterm || undefined,
          lcStatus: values.lcStatus || undefined,
          stuffAdvanceNo: values.stuffAdvanceNo || undefined,
        }
        await createMutation.mutateAsync(data)
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save demand:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  // Month is a server-side projection of the deadline — shown, never entered.
  const watchedDeadline = useWatch({ control: form.control, name: "deadline" })
  const watchedType = useWatch({ control: form.control, name: "type" })
  const derivedMonth = monthOfDate(watchedDeadline ?? "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[560px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit Demand" : "Add Demand"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the demand details. Type and month cannot be changed, and the product is linked from the demand list."
              : "Create a new production demand."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <ScrollableDialogBody className="space-y-4">
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={isEditing || isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEMAND_TYPE_OPTIONS.filter(
                            (o) => o.value !== DemandType.DEMAND_TYPE_UNSPECIFIED
                          ).map((o) => (
                            <SelectItem key={o.value} value={String(o.value)}>
                              {o.label}
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
                  name="subType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Type</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={isEditing || isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEMAND_SUB_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={String(o.value)}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>May be left unset for Sample.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Create only: on an existing demand the product is changed
                  through the row's Link Product action, which is the single
                  path that can actually write it (MapDemandProduct). Rendering
                  it here disabled only implied an edit that never existed. */}
              {!isEditing && (
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
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        {watchedType === DemandType.DEMAND_TYPE_CONTRACT
                          ? "Finance CPM product (soft reference)."
                          : "Optional — leave blank if the product master does not exist yet and link it later. Planning stays blocked until it is linked."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="qtyOriginal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity (Original)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 1500"
                          inputMode="decimal"
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
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} disabled={isPending} />
                      </FormControl>
                      <FormDescription>
                        Plan month{" "}
                        <span className="font-mono">{derivedMonth || "—"}</span>, derived from the
                        deadline.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Grade sits with the AX/AM tolerances rather than alone: a lone
                  half-width select left a dead column beside it. */}
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="gradeRequirement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Requirement</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GRADE_REQ_OPTIONS.filter(
                            (o) => o.value !== GradeReq.GRADE_REQ_UNSPECIFIED
                          ).map((o) => (
                            <SelectItem key={o.value} value={String(o.value)}>
                              {o.label}
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
                  name="axMinPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AX Min %</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional"
                          inputMode="decimal"
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
                  name="amMaxPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AM Max %</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional"
                          inputMode="decimal"
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

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="contractNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract No</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} value={field.value || ""} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                          disabled={isEditing || isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <FormControl>
                        <CustomerCombobox
                          value={field.value ? Number(field.value) : undefined}
                          onChange={(customerId) => field.onChange(String(customerId))}
                          placeholder="Optional — search by code or name…"
                          // A pulled demand already has a customer id but no
                          // loaded search page to name it; the backend
                          // decorates the record with code/name for exactly
                          // this, so a disabled field still reads as itself.
                          valueCode={demand?.customerCode}
                          valueName={demand?.customerName}
                          disabled={isEditing || isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stuffAdvanceNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stuffing Advance No</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} value={field.value || ""} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="incoterm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incoterm</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} value={field.value || ""} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lcStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LC Status</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} value={field.value || ""} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollableDialogBody>

            <ScrollableDialogFooter>
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
            </ScrollableDialogFooter>
          </form>
        </Form>
      </ScrollableDialogContent>
    </Dialog>
  )
}
