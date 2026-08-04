"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogBody,
  ScrollableDialogContent,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { WorkOrder } from "@/types/ppc/work-order"
import type { PlanItem } from "@/types/ppc/plan-item"
import { AREA_OPTIONS, PROD_CATEGORY_OPTIONS, AreaCode, ProdCategory } from "@/types/ppc/common"
import { useCreateWorkOrder, useUpdateWorkOrder } from "@/hooks/ppc/use-work-order"
import { useProductRoute } from "@/hooks/ppc/use-products-search"
import { MachineCombobox, LookupCombobox } from "@/components/ppc/comboboxes"
import { PlanItemMultiSelect } from "./plan-item-multi-select"
import { LotErrorHint } from "./lot-error-hint"

// The route and the demand are NOT planner inputs. Planning already broke the
// product's route into one plan item per level (an FG_DELIVERY item plus the
// cascaded INTERMEDIATE items — services/ppc/internal/application/planitem/
// cascade.go), so re-entering the route here would let a planner contradict the
// plan. Both are derived from the anchor plan item at submit time instead.
const formSchema = z.object({
  area: z.number().min(1, "Area is required"),
  planItemId: z.coerce.number().min(1, "At least one plan item is required"),
  machineId: z.coerce.number().min(1, "Machine is required"),
  // Optional on create: leaving it blank asks the server to mint a lot and
  // register it, so requiring one here would make that path unreachable.
  // wo_lot_no is VARCHAR(30) and the proto caps lot_no at 30; a longer value
  // would only be rejected server-side after a round trip.
  lotNo: z.string().max(30, "Lot number must be 30 characters or fewer"),
  qtyTarget: z.string().min(1, "Target quantity is required"),
  deadline: z.string().min(1, "Deadline is required"),
  gradeRequirement: z.string().optional(),
  prodCategory: z.number().optional(),
  autoApproveDisabled: z.boolean(),
  revisionReason: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface WorkOrderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrder?: WorkOrder | null
}

const emptyValues: FormValues = {
  area: AreaCode.AREA_CODE_TXT,
  planItemId: 0,
  machineId: 0,
  lotNo: "",
  qtyTarget: "",
  deadline: "",
  gradeRequirement: "",
  prodCategory: ProdCategory.PROD_CATEGORY_NORMAL,
  autoApproveDisabled: false,
  revisionReason: "",
}

export function WorkOrderFormDialog({ open, onOpenChange, workOrder }: WorkOrderFormDialogProps) {
  const isEditing = !!workOrder
  const createMutation = useCreateWorkOrder()
  const updateMutation = useUpdateWorkOrder()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: emptyValues,
  })

  // Plan items this work order covers. The first is the anchor: it supplies the
  // product, the route and the demand. The rest ride along as merged items.
  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  // Structural reset — a freshly opened dialog must not inherit the previous
  // session's picks, and setting state from an effect is a React Compiler error.
  const [wasOpen, setWasOpen] = useState(false)
  // The last submit failure, kept so a lot problem stays readable (with its
  // fixing link) instead of disappearing with the toast.
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)
  if (open && !wasOpen) {
    setWasOpen(true)
    setPlanItems([])
    setSubmitError(undefined)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const anchor = planItems[0]
  const extras = planItems.slice(1)

  // The route comes from the anchor plan item's product, never from a picker.
  const { data: route, isLoading: routeLoading } = useProductRoute(anchor?.cpmProductSysId)
  const routeMissing = !isEditing && !!anchor && !routeLoading && !route

  const watchedArea = useWatch({ control: form.control, name: "area" })
  const watchedQtyTarget = useWatch({ control: form.control, name: "qtyTarget" })

  const mergedQty = useMemo(
    () => extras.reduce((sum, p) => sum + (Number(p.qtyTarget) || 0), 0),
    [extras]
  )
  const anchorQty = Number(watchedQtyTarget) || 0
  const totalQty = anchorQty + mergedQty

  const handlePlanItemsChange = (next: PlanItem[]) => {
    setPlanItems(next)
    const nextAnchor = next[0]
    form.setValue("planItemId", nextAnchor?.planItemId ?? 0, { shouldValidate: true })
    // Seed the editable fields from the anchor the first time it is chosen, so
    // the planner confirms numbers rather than retyping them.
    if (nextAnchor && nextAnchor.planItemId !== anchor?.planItemId) {
      if (nextAnchor.qtyTarget) form.setValue("qtyTarget", nextAnchor.qtyTarget)
      if (nextAnchor.deadline) form.setValue("deadline", nextAnchor.deadline)
    }
  }

  useEffect(() => {
    if (!open) return
    if (workOrder) {
      form.reset({
        area: workOrder.area,
        planItemId: workOrder.planItemId,
        machineId: workOrder.machineId,
        lotNo: workOrder.lotNo || "",
        qtyTarget: workOrder.qtyTarget || "",
        deadline: workOrder.deadline || "",
        gradeRequirement: workOrder.gradeRequirement || "",
        prodCategory: workOrder.prodCategory,
        autoApproveDisabled: workOrder.autoApproveDisabled ?? false,
        revisionReason: workOrder.revisionReason || "",
      })
    } else {
      form.reset(emptyValues)
    }
  }, [open, workOrder, form])

  const onSubmit = async (values: FormValues) => {
    setSubmitError(undefined)
    try {
      if (isEditing && workOrder) {
        await updateMutation.mutateAsync({
          id: String(workOrder.woId),
          data: {
            woId: workOrder.woId,
            machineId: values.machineId,
            // Update has no generator: a cleared field means "leave the lot
            // alone", not "mint a new one".
            lotNo: values.lotNo || undefined,
            qtyTarget: values.qtyTarget,
            deadline: values.deadline,
            gradeRequirement: values.gradeRequirement || undefined,
            prodCategory: values.prodCategory as ProdCategory | undefined,
            autoApproveDisabled: values.autoApproveDisabled,
            revisionReason: values.revisionReason || undefined,
          },
        })
      } else {
        if (!anchor) {
          toast.error("Select at least one plan item")
          return
        }
        if (!route) {
          toast.error(
            `No released route for ${anchor.productCode}. Release a route for this product before creating a work order.`
          )
          return
        }
        await createMutation.mutateAsync({
          area: values.area as AreaCode,
          planItemId: anchor.planItemId,
          machineId: values.machineId,
          // Derived from the anchor plan item's product — the planner never
          // sees or picks these.
          crhHeadId: route.headId,
          crhVersion: route.version,
          lotNo: values.lotNo,
          demandId: anchor.demandId || undefined,
          qtyTarget: values.qtyTarget,
          deadline: values.deadline,
          gradeRequirement: values.gradeRequirement || undefined,
          prodCategory: values.prodCategory as ProdCategory | undefined,
          autoApproveDisabled: values.autoApproveDisabled,
          additionalPlanItemIds: extras.map((p) => p.planItemId),
          // Send each contribution explicitly so the WO total matches the
          // running total the planner just saw, rather than re-deriving it.
          qtyContributions: extras.map((p) => p.qtyTarget ?? "0"),
        })
      }
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to save work order:", e)
      // Keep the dialog open and hold on to the server's own sentence: a lot
      // failure names a master the planner must go and fix, which is unreadable
      // in a toast that disappears.
      setSubmitError(e instanceof Error ? e.message : String(e))
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[620px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit Work Order" : "Create Work Order"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the work order details. Route and plan references are locked."
              : "Pick the plan items this work order covers. Route and demand follow from them."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <ScrollableDialogBody className="space-y-4">
              {/* A lot failure is not something the planner can fix inside this
                  dialog, so it stays on screen with a link to the right master
                  rather than vanishing with the toast. */}
              <LotErrorHint message={submitError} />
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="planItemId"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Plan Items <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <PlanItemMultiSelect
                          value={planItems}
                          onChange={handlePlanItemsChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!isEditing && !!anchor && (
                <div className="grid items-start gap-4 rounded-md border p-3 text-sm sm:grid-cols-2 [&>*]:min-w-0">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Route</p>
                    {routeLoading ? (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving…
                      </p>
                    ) : route ? (
                      <p className="font-medium">
                        {route.productCode} · v{route.version}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({route.routingStatus})
                        </span>
                      </p>
                    ) : (
                      <p className="font-medium text-destructive">No released route</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Demand</p>
                    <p className="font-medium">
                      {anchor.demandId ? "From plan item" : "Not linked"}
                    </p>
                  </div>
                  <div className="space-y-0.5 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Total work-order qty</p>
                    <p className="font-medium">
                      {totalQty.toLocaleString()} kg
                      {extras.length > 0 && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({anchorQty.toLocaleString()} anchor + {mergedQty.toLocaleString()} from{" "}
                          {extras.length} merged)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {routeMissing && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
                  {anchor.productCode} has no released route in the cost master. A work order
                  cannot be created until one is released.
                </p>
              )}

              <div className="grid items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Area <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={String(field.value ?? "")}
                        onValueChange={(v) => {
                          field.onChange(Number(v))
                          // Machine list is area-scoped — a machine picked under
                          // the previous area is no longer valid.
                          form.setValue("machineId", 0)
                        }}
                        disabled={isEditing || isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AREA_OPTIONS.filter(
                            (o) => o.value !== AreaCode.AREA_CODE_UNSPECIFIED
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
                  name="machineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Machine <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <MachineCombobox
                          value={field.value || undefined}
                          onChange={(id) => field.onChange(id)}
                          area={watchedArea as AreaCode}
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
                name="lotNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Lot Number {isEditing && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        disabled={isPending}
                        placeholder={isEditing ? undefined : "Leave blank to generate automatically"}
                      />
                    </FormControl>
                    {!isEditing && (
                      <FormDescription>
                        <strong>Leave this blank</strong> and a lot number is generated for you and
                        registered in the lot master automatically — this is the usual choice. Only
                        type a lot number if it is <em>already</em> registered in the lot master; an
                        unknown one is rejected rather than created.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="qtyTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Target Qty (kg) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} disabled={isPending} placeholder="e.g., 1000" />
                      </FormControl>
                      {!isEditing && (
                        <FormDescription>Anchor plan item&apos;s share.</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Deadline <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="gradeRequirement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Requirement</FormLabel>
                      <FormControl>
                        <LookupCombobox
                          category="PPC_GRADE_REQ"
                          value={field.value || undefined}
                          onChange={(code) => field.onChange(code)}
                          placeholder="Optional"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prodCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Category</FormLabel>
                      <Select
                        value={String(field.value ?? ProdCategory.PROD_CATEGORY_NORMAL)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROD_CATEGORY_OPTIONS.filter(
                            (o) => o.value !== ProdCategory.PROD_CATEGORY_UNSPECIFIED
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
              </div>

              {isEditing && (
                <FormField
                  control={form.control}
                  name="revisionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revision Reason</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          disabled={isPending}
                          placeholder="Required when revising an approved WO"
                        />
                      </FormControl>
                      <FormDescription>Shown on the WO face (e.g. &quot;PINDAH MC 05&quot;).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="autoApproveDisabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="min-w-0 space-y-0.5">
                      <FormLabel className="text-base">Disable Auto-Approve</FormLabel>
                      <FormDescription>
                        When on, the WO requires an explicit PM approval and will not auto-run.
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
            </ScrollableDialogBody>

            <ScrollableDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || routeMissing}>
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
