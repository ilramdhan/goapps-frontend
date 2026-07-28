"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertTriangle, Loader2, X } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { cn } from "@/lib/utils"
import type { PlanItem } from "@/types/ppc/plan-item"
import {
  PLAN_ITEM_TYPE_OPTIONS,
  PlanItemType,
  RMSource,
  DemandStatus,
  monthOfDate,
  inclusiveDays,
  startDateForDuration,
} from "@/types/ppc/common"
import { useCreatePlanItem, useUpdatePlanItem } from "@/hooks/ppc/use-plan-item"
import { useDemand } from "@/hooks/ppc/use-demand"
import {
  ProductCombobox,
  MachineGroupCombobox,
  DemandCombobox,
  PlanItemCombobox,
} from "@/components/ppc/comboboxes"

// RMSource select options (no shared list in common.ts).
const RM_SOURCE_OPTIONS = [
  { value: RMSource.RM_SOURCE_UNSPECIFIED, label: "Unspecified" },
  { value: RMSource.RM_SOURCE_STORE, label: "Store" },
  { value: RMSource.RM_SOURCE_CAPTIVE, label: "Captive" },
  { value: RMSource.RM_SOURCE_MIXED, label: "Mixed" },
]

// Type options excluding the "All Types" UNSPECIFIED placeholder.
const TYPE_OPTIONS = PLAN_ITEM_TYPE_OPTIONS.filter(
  (o) => o.value !== PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED
)

const formSchema = z.object({
  // Kept in the form rather than in component state so the single reset on open
  // restores it along with everything else — a separate setState in that effect
  // is a cascading-render lint error under the React Compiler.
  sourceMode: z.enum(["demand", "parent"]),
  cpmProductSysId: z.coerce.number().int().positive("Product system ID is required"),
  type: z.coerce.number().int().min(1, "Type is required"),
  qtyTarget: z
    .string()
    .min(1, "Quantity target is required")
    .regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
  deadline: z.string().min(1, "Deadline is required"),
  machineGroupId: z.coerce.number().int().positive("Machine group ID is required"),
  plannedStartDate: z.string().optional(),
  plannedDurationDays: z.string().optional(),
  rmSource: z.coerce.number().int(),
  demandId: z.string().optional(),
  parentItemId: z.string().optional(),
  notes: z.string().max(500, "Notes must be at most 500 characters").optional(),
})

type PlanItemFormValues = z.infer<typeof formSchema>

const defaultValues: PlanItemFormValues = {
  sourceMode: "demand",
  cpmProductSysId: 0,
  type: PlanItemType.PLAN_ITEM_TYPE_FG_DELIVERY,
  qtyTarget: "",
  deadline: "",
  machineGroupId: 0,
  plannedStartDate: "",
  plannedDurationDays: "",
  rmSource: RMSource.RM_SOURCE_UNSPECIFIED,
  demandId: "",
  parentItemId: "",
  notes: "",
}

/** Section wrapper — keeps the long form readable and the labels aligned. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * How the item is anchored. The command contract still carries exactly one of
 * demandId / parentItemId — this only replaces two look-alike comboboxes that
 * disabled each other with an explicit up-front choice, so the planner is told
 * which one applies instead of discovering it by clicking a dead control.
 */
type SourceMode = "demand" | "parent"

const SOURCE_MODES: { value: SourceMode; label: string; hint: string }[] = [
  {
    value: "demand",
    label: "From a confirmed demand",
    hint: "Plans a finished good against a customer demand. Product and deadline follow the demand.",
  },
  {
    value: "parent",
    label: "Under an existing parent item",
    hint: "Plans an intermediate stage feeding a finished-good item you already planned.",
  },
]

/** The plan-item type each source mode defaults to. */
const TYPE_FOR_MODE: Record<SourceMode, PlanItemType> = {
  demand: PlanItemType.PLAN_ITEM_TYPE_FG_DELIVERY,
  parent: PlanItemType.PLAN_ITEM_TYPE_INTERMEDIATE,
}

/**
 * Types each mode can legitimately produce. A parent-anchored item is an
 * intermediate stage by definition; a demand-anchored one is a delivery, or
 * make-to-stock when the demand itself is MTS.
 */
const TYPES_FOR_MODE: Record<SourceMode, PlanItemType[]> = {
  demand: [PlanItemType.PLAN_ITEM_TYPE_FG_DELIVERY, PlanItemType.PLAN_ITEM_TYPE_MTS],
  parent: [PlanItemType.PLAN_ITEM_TYPE_INTERMEDIATE],
}

/**
 * Timeline fields to send. Sending either marks the item MANUAL server-side, so
 * an untouched schedule is omitted entirely and stays system-derived.
 */
function timelinePayload(
  values: PlanItemFormValues,
  planItem?: PlanItem | null
): { plannedStartDate?: string; plannedDurationDays?: number } {
  const start = values.plannedStartDate?.trim() ?? ""
  const days = Number(values.plannedDurationDays ?? "")
  if (!start || !Number.isFinite(days) || days < 1) return {}

  const sameStart = (planItem?.plannedStartDate ?? "").slice(0, 10) === start
  const sameDays = (planItem?.plannedDurationDays ?? 0) === days
  if (planItem && sameStart && sameDays) return {}

  return { plannedStartDate: start, plannedDurationDays: days }
}

interface PlanItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planItem?: PlanItem | null
  onSuccess?: () => void
}

export function PlanItemFormDialog({
  open,
  onOpenChange,
  planItem,
  onSuccess,
}: PlanItemFormDialogProps) {
  const isEditing = !!planItem
  const createMutation = useCreatePlanItem()
  const updateMutation = useUpdatePlanItem()

  const form = useForm<PlanItemFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues,
  })

  // Only one of the two anchors is ever shown, so the mode is the control the
  // planner actually operates; demandId / parentItemId stay derived from it.
  const sourceMode = (useWatch({ control: form.control, name: "sourceMode" }) ??
    "demand") as SourceMode

  useEffect(() => {
    if (!open) return
    if (planItem) {
      form.reset({
        sourceMode:
          planItem.type === PlanItemType.PLAN_ITEM_TYPE_INTERMEDIATE || planItem.parentItemId
            ? "parent"
            : "demand",
        cpmProductSysId: planItem.cpmProductSysId || 0,
        type: planItem.type || PlanItemType.PLAN_ITEM_TYPE_FG_DELIVERY,
        qtyTarget: planItem.qtyTarget || "",
        deadline: planItem.deadline ? planItem.deadline.slice(0, 10) : "",
        machineGroupId: planItem.machineGroupId || 0,
        plannedStartDate: planItem.plannedStartDate ? planItem.plannedStartDate.slice(0, 10) : "",
        plannedDurationDays: planItem.plannedDurationDays
          ? String(planItem.plannedDurationDays)
          : "",
        rmSource: planItem.rmSource || RMSource.RM_SOURCE_UNSPECIFIED,
        demandId: planItem.demandId ? String(planItem.demandId) : "",
        parentItemId: planItem.parentItemId ? String(planItem.parentItemId) : "",
        notes: planItem.notes || "",
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, planItem, form])

  const isPending = createMutation.isPending || updateMutation.isPending
  // Month is a server-side projection of the deadline — shown, never entered.
  const watched = useWatch({ control: form.control })
  const deadline = watched.deadline ?? ""
  const derivedMonth = monthOfDate(deadline)
  const isManualTimeline =
    planItem?.durationSource === "MANUAL" ||
    !!watched.plannedStartDate ||
    !!watched.plannedDurationDays

  // A demand carries the product, the quantity and the deadline already, so on
  // creation those three are taken from it instead of being re-asked. Only the
  // quantity stays editable — a demand may legitimately be split across several
  // plan items.
  const demandIdValue = !isEditing ? (watched.demandId ?? "") : ""
  const { data: demandResult, isLoading: isDemandLoading } = useDemand(demandIdValue)
  const selectedDemand = demandIdValue ? (demandResult?.data ?? null) : null

  // Copy the demand's fields into the form once per selected demand. A ref, not
  // state, so a later manual quantity edit is never overwritten by a re-render.
  const syncedDemandRef = useRef<number | null>(null)
  useEffect(() => {
    if (!selectedDemand) {
      syncedDemandRef.current = null
      return
    }
    if (syncedDemandRef.current === selectedDemand.demandId) return
    syncedDemandRef.current = selectedDemand.demandId
    form.setValue("cpmProductSysId", selectedDemand.cpmProductSysId || 0, {
      shouldValidate: true,
    })
    form.setValue("deadline", (selectedDemand.deadline || "").slice(0, 10), {
      shouldValidate: true,
    })
    form.setValue("qtyTarget", selectedDemand.qtyRemaining || selectedDemand.qtyOriginal || "", {
      shouldValidate: true,
    })
  }, [selectedDemand, form])

  // Over-allocating a demand is a warning, never a block: the remaining figure
  // can legitimately be stale relative to what the planner is committing to.
  const remainingQty = Number(selectedDemand?.qtyRemaining ?? "")
  const enteredQty = Number(watched.qtyTarget ?? "")
  const qtyExceedsRemaining =
    !!selectedDemand &&
    Number.isFinite(remainingQty) &&
    Number.isFinite(enteredQty) &&
    enteredQty > remainingQty

  const isDemandDriven = !!selectedDemand
  const lockedByDemand = isDemandDriven || (!isEditing && !!demandIdValue && isDemandLoading)

  // Switching the anchor clears the other leg, so exactly one of demandId /
  // parentItemId can ever reach the command — the invariant the two mutually
  // disabling comboboxes used to enforce by being unusable.
  const onSourceModeChange = (mode: SourceMode) => {
    form.setValue("sourceMode", mode)
    form.setValue("demandId", "")
    form.setValue("parentItemId", "")
    form.setValue("type", TYPE_FOR_MODE[mode], { shouldValidate: true })
    if (mode === "parent") {
      // Demand mode owned these; a parent-anchored item enters them itself.
      form.setValue("cpmProductSysId", 0)
      form.setValue("deadline", "")
      form.setValue("qtyTarget", "")
      syncedDemandRef.current = null
    }
  }

  const onSubmit = async (values: PlanItemFormValues) => {
    // Only the active mode's anchor is sent: the backend rejects both being
    // set, and a stale value from a mode the planner switched away from would
    // otherwise resurface here.
    const demandId =
      sourceMode === "demand" && values.demandId?.trim() ? Number(values.demandId) : undefined
    const parentItemId =
      sourceMode === "parent" && values.parentItemId?.trim()
        ? Number(values.parentItemId)
        : undefined
    const timeline = timelinePayload(values, planItem)

    try {
      if (isEditing && planItem) {
        // Update supports only the mutable subset of fields.
        await updateMutation.mutateAsync({
          id: String(planItem.planItemId),
          data: {
            planItemId: planItem.planItemId,
            qtyTarget: values.qtyTarget,
            deadline: values.deadline,
            rmSource: values.rmSource as RMSource,
            machineGroupId: values.machineGroupId,
            notes: values.notes || "",
            ...timeline,
          },
        })
      } else {
        await createMutation.mutateAsync({
          cpmProductSysId: values.cpmProductSysId,
          type: values.type as PlanItemType,
          qtyTarget: values.qtyTarget,
          deadline: values.deadline,
          machineGroupId: values.machineGroupId,
          // Month is derived from the deadline; only carry-forward overrides it.
          monthOverride: false,
          rmSource: values.rmSource as RMSource,
          demandId,
          parentItemId,
          notes: values.notes || undefined,
          ...timeline,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save plan item:", error)
    }
  }

  // Start date and duration are two views of the same window ending on the
  // deadline, so editing either recomputes the other.
  const onStartDateChange = (value: string) => {
    form.setValue("plannedStartDate", value)
    const days = inclusiveDays(value, deadline)
    form.setValue("plannedDurationDays", days > 0 ? String(days) : "")
  }

  const onDurationChange = (value: string) => {
    form.setValue("plannedDurationDays", value)
    form.setValue("plannedStartDate", startDateForDuration(deadline, Number(value)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[640px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan Item" : "Add Plan Item"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the mutable fields of this plan item."
              : "Create a new production plan item."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form
            id="plan-item-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="contents"
          >
            <ScrollableDialogBody className="space-y-6">
              <Section title="Source">
                {isEditing && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={String(field.value)} disabled>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TYPE_OPTIONS.map((o) => (
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
                )}

                {!isEditing && (
                  <div className="space-y-4">
                    <RadioGroup
                      value={sourceMode}
                      onValueChange={(v) => onSourceModeChange(v as SourceMode)}
                      disabled={isPending}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      {SOURCE_MODES.map((m) => (
                        <Label
                          key={m.value}
                          htmlFor={`source-mode-${m.value}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                            sourceMode === m.value
                              ? "border-primary bg-primary/5"
                              : "border-input hover:bg-accent/40",
                            isPending && "cursor-not-allowed opacity-60"
                          )}
                        >
                          <RadioGroupItem
                            id={`source-mode-${m.value}`}
                            value={m.value}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 space-y-1">
                            <span className="block text-sm font-medium leading-tight">
                              {m.label}
                            </span>
                            <span className="block text-xs font-normal leading-snug text-muted-foreground">
                              {m.hint}
                            </span>
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>

                    {sourceMode === "demand" ? (
                      <FormField
                        control={form.control}
                        name="demandId"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <FormLabel>
                                Demand <span className="text-destructive">*</span>
                              </FormLabel>
                              {!!field.value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  disabled={isPending}
                                  onClick={() => field.onChange("")}
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Clear
                                </Button>
                              )}
                            </div>
                            <FormControl>
                              {/* withoutPlan is filtered server-side: a demand
                                  already carrying a plan item must not be
                                  offered for a second one. */}
                              <DemandCombobox
                                value={field.value ? Number(field.value) : undefined}
                                onChange={(id) => field.onChange(String(id))}
                                status={DemandStatus.DEMAND_STATUS_CONFIRMED}
                                withoutPlan
                                disabled={isPending}
                                placeholder="Search a confirmed demand…"
                              />
                            </FormControl>
                            <FormDescription>
                              Confirmed demands that are not planned yet. Product and deadline are
                              taken from the one you pick.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="parentItemId"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <FormLabel>
                                Parent Item <span className="text-destructive">*</span>
                              </FormLabel>
                              {!!field.value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  disabled={isPending}
                                  onClick={() => field.onChange("")}
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Clear
                                </Button>
                              )}
                            </div>
                            <FormControl>
                              {/* No status filter: a parent is legitimate while
                                  still DRAFT, and every freshly created FG item
                                  starts DRAFT. Filtering on ACTIVE left this
                                  list permanently empty. */}
                              <PlanItemCombobox
                                value={field.value ? Number(field.value) : undefined}
                                onChange={(id) => field.onChange(String(id))}
                                type={PlanItemType.PLAN_ITEM_TYPE_FG_DELIVERY}
                                disabled={isPending}
                                placeholder="Search a finished-good plan item…"
                              />
                            </FormControl>
                            <FormDescription>
                              Finished-good plan items. Pick the product this stage feeds into.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Only the types the chosen anchor can produce: an
                        intermediate has no meaning without a parent, and a
                        delivery has none without a demand. */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Type <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={String(field.value)}
                            disabled={isPending || TYPES_FOR_MODE[sourceMode].length === 1}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TYPE_OPTIONS.filter((o) =>
                                TYPES_FOR_MODE[sourceMode].includes(o.value as PlanItemType)
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
                )}
              </Section>

              <Section title="Product & Quantity">
                <FormField
                  control={form.control}
                  name="cpmProductSysId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Product <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <ProductCombobox
                          value={field.value || undefined}
                          onChange={(id) => field.onChange(id)}
                          disabled={isEditing || isPending || lockedByDemand}
                          // Same reason as the demand form: the loaded search page
                          // rarely contains the edited item's product, so pass the
                          // decorated labels through instead of showing a blank.
                          valueCode={planItem?.productCode ?? selectedDemand?.productCode}
                          valueName={planItem?.productName ?? selectedDemand?.productName}
                        />
                      </FormControl>
                      <FormDescription>
                        {isDemandDriven
                          ? "Taken from the selected demand."
                          : "Soft reference to the CPM product."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="qtyTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Qty Target <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="e.g., 1500"
                            {...field}
                            value={field.value || ""}
                            disabled={isPending}
                          />
                        </FormControl>
                        {isDemandDriven && (
                          <FormDescription>
                            Remaining on this demand:{" "}
                            <span className="tabular-nums">
                              {Number.isFinite(remainingQty)
                                ? remainingQty.toLocaleString()
                                : (selectedDemand?.qtyRemaining ?? "-")}
                            </span>
                            . Lower it to plan a partial split.
                          </FormDescription>
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
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ""}
                            disabled={isPending || lockedByDemand}
                          />
                        </FormControl>
                        <FormDescription>
                          {isDemandDriven ? (
                            <>
                              From the demand. Plan month{" "}
                              <span className="font-mono">{derivedMonth || "—"}</span>.
                            </>
                          ) : (
                            <>
                              Plan month <span className="font-mono">{derivedMonth || "—"}</span>,
                              derived from the deadline.
                            </>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {qtyExceedsRemaining && (
                  <p className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Quantity exceeds the demand&apos;s remaining{" "}
                      <span className="tabular-nums">{remainingQty.toLocaleString()}</span>. This is
                      allowed — confirm it is intentional before saving.
                    </span>
                  </p>
                )}
              </Section>

              <Section title="Schedule">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="plannedStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planned Start</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="plannedDurationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            placeholder="Auto"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => onDurationChange(e.target.value)}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isManualTimeline
                    ? "Manual — kept as entered when the quantity changes."
                    : "Leave blank to let the system derive the window from qty and capacity."}
                </p>
              </Section>

              <Section title="Production">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="machineGroupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Machine Group <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <MachineGroupCombobox
                            value={field.value || undefined}
                            onChange={(id) => field.onChange(id)}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rmSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RM Source</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={String(field.value)}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select RM source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RM_SOURCE_OPTIONS.map((o) => (
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

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optional notes..."
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
              </Section>
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
