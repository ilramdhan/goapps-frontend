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

import type { Machine } from "@/types/finance/machine"
import { useCreateMachine, useUpdateMachine } from "@/hooks/finance/use-machine"

// Numeric fields share one schema fragment so precision rules stay consistent
// across every field in this form. Legacy bulk-imported data can carry more
// decimal places than the UI ever asks a user to type (e.g. power/day =
// 1792.8718), so validation only bounds the *range*, never the *precision* —
// precision is a UI/input concern (see the `step="any"` inputs below), not a
// data-integrity one. Do NOT reintroduce a `.multipleOf()`/step-like zod
// constraint here without checking legacy data first.
const optionalNonNegativeNumber = z.coerce.number().min(0).optional().nullable()

// `machineCode` is the primary key: editable only at creation time. The
// field is rendered `disabled` on update, and its value is intentionally
// excluded from the update mutation payload below (see onSubmit) — so on
// update this schema must not re-validate the format of pre-existing/legacy
// codes (some legacy codes, e.g. "E Line", predate the uppercase/kebab rule).
const machineCodeFormatSchema = z
  .string()
  .min(1, "Code is required")
  .max(30)
  .regex(/^[A-Z][A-Z0-9_-]*$/, "Uppercase, digits, hyphens or underscores")

const sharedMachineFields = {
  machineName: z.string().min(1, "Name is required").max(100),
  mcType: z.string().max(30).optional(),
  mcLocation: z.string().max(100).optional(),
  noOfPosition: z.coerce.number().int().min(0).default(0),
  noOfEnd: z.coerce.number().int().min(1).default(1),
  mcSpeed: z.coerce.number().min(0).default(0),
  mcEfficiency: z.coerce.number().min(0).max(100).default(95),
  machineRpm: optionalNonNegativeNumber,
  powerPerDay: optionalNonNegativeNumber,
  mpPerDay: optionalNonNegativeNumber,
  ohsPerDay: optionalNonNegativeNumber,
  sparesPerDay: optionalNonNegativeNumber,
  kgsLostChange: optionalNonNegativeNumber,
  mcPoyBobbinWeight: optionalNonNegativeNumber,
  mcTotFxdCst: optionalNonNegativeNumber,
  mcBobbinPerTrolly: optionalNonNegativeNumber,
  mcBoxCost: optionalNonNegativeNumber,
  mcCaptivePerBobbin: optionalNonNegativeNumber,
  mcWeightage: optionalNonNegativeNumber,
  vb1Qty: optionalNonNegativeNumber,
  vb2Qty: optionalNonNegativeNumber,
  vb3Qty: optionalNonNegativeNumber,
  vb4Qty: optionalNonNegativeNumber,
  vb5Qty: optionalNonNegativeNumber,
  notes: z.string().max(500).optional(),
  isActive: z.boolean(),
}

// Create: machineCode is user-entered, so the strict format rule still applies.
const createFormSchema = z.object({
  machineCode: machineCodeFormatSchema,
  ...sharedMachineFields,
})

// Update: machineCode is read-only/disabled and never sent to the API (see
// onSubmit), so it must not be re-validated against the create-time regex —
// otherwise saving legacy data that predates the format rule (or simply
// re-saving the form unchanged) would be blocked. Still required as a
// non-empty string so the form/type stays sane, just not format-checked.
const updateFormSchema = z.object({
  machineCode: z.string().min(1),
  ...sharedMachineFields,
})

type FormValues = z.infer<typeof createFormSchema>

interface MachineFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine?: Machine | null
  onSuccess?: () => void
}

export function MachineFormDialog({ open, onOpenChange, machine, onSuccess }: MachineFormDialogProps) {
  const isEditing = !!machine
  const createMutation = useCreateMachine()
  const updateMutation = useUpdateMachine()

  const form = useForm<FormValues>({
    // Resolver is re-evaluated every render, so switching schema when
    // `isEditing` flips (this dialog instance is reused for both add/edit —
    // see machine-page-client.tsx) picks up the right rules immediately.
    resolver: zodResolver(isEditing ? updateFormSchema : createFormSchema) as never,
    defaultValues: {
      machineCode: "", machineName: "", mcType: "", mcLocation: "",
      noOfPosition: 0, noOfEnd: 1, mcSpeed: 0, mcEfficiency: 95,
      machineRpm: null, powerPerDay: null,
      mpPerDay: null, ohsPerDay: null, sparesPerDay: null,
      kgsLostChange: null,
      mcPoyBobbinWeight: null, mcTotFxdCst: null, mcBobbinPerTrolly: null,
      mcBoxCost: null, mcCaptivePerBobbin: null, mcWeightage: null,
      vb1Qty: null, vb2Qty: null,
      vb3Qty: null, vb4Qty: null, vb5Qty: null,
      notes: "", isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        machine
          ? {
              machineCode: machine.machineCode,
              machineName: machine.machineName,
              mcType: machine.mcType || "",
              mcLocation: machine.mcLocation || "",
              noOfPosition: machine.noOfPosition ?? 0,
              noOfEnd: machine.noOfEnd ?? 1,
              mcSpeed: machine.mcSpeed ?? 0,
              mcEfficiency: machine.mcEfficiency ?? 95,
              machineRpm: machine.machineRpm ?? null,
              powerPerDay: machine.powerPerDay ?? null,
              mpPerDay: machine.mpPerDay ?? null,
              ohsPerDay: machine.ohsPerDay ?? null,
              sparesPerDay: machine.sparesPerDay ?? null,
              kgsLostChange: machine.kgsLostChange ?? null,
              mcPoyBobbinWeight: machine.mcPoyBobbinWeight ?? null,
              mcTotFxdCst: machine.mcTotFxdCst ?? null,
              mcBobbinPerTrolly: machine.mcBobbinPerTrolly ?? null,
              mcBoxCost: machine.mcBoxCost ?? null,
              mcCaptivePerBobbin: machine.mcCaptivePerBobbin ?? null,
              mcWeightage: machine.mcWeightage ?? null,
              vb1Qty: machine.vb1Qty ?? null,
              vb2Qty: machine.vb2Qty ?? null,
              vb3Qty: machine.vb3Qty ?? null,
              vb4Qty: machine.vb4Qty ?? null,
              vb5Qty: machine.vb5Qty ?? null,
              notes: machine.notes || "",
              isActive: machine.isActive ?? true,
            }
          : {
              machineCode: "", machineName: "", mcType: "", mcLocation: "",
              noOfPosition: 0, noOfEnd: 1, mcSpeed: 0, mcEfficiency: 95,
              machineRpm: null, powerPerDay: null,
              mpPerDay: null, ohsPerDay: null, sparesPerDay: null,
              kgsLostChange: null,
              mcPoyBobbinWeight: null, mcTotFxdCst: null, mcBobbinPerTrolly: null,
              mcBoxCost: null, mcCaptivePerBobbin: null, mcWeightage: null,
              vb1Qty: null, vb2Qty: null,
              vb3Qty: null, vb4Qty: null, vb5Qty: null,
              notes: "", isActive: true,
            }
      )
    }
  }, [open, machine, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && machine) {
        await updateMutation.mutateAsync({
          id: machine.machineId,
          data: {
            machineId: machine.machineId,
            machineName: values.machineName,
            mcType: values.mcType,
            mcLocation: values.mcLocation,
            noOfPosition: values.noOfPosition,
            noOfEnd: values.noOfEnd,
            mcSpeed: values.mcSpeed,
            mcEfficiency: values.mcEfficiency,
            machineRpm: values.machineRpm ?? undefined,
            powerPerDay: values.powerPerDay ?? undefined,
            mpPerDay: values.mpPerDay ?? undefined,
            ohsPerDay: values.ohsPerDay ?? undefined,
            sparesPerDay: values.sparesPerDay ?? undefined,
            kgsLostChange: values.kgsLostChange ?? undefined,
            mcPoyBobbinWeight: values.mcPoyBobbinWeight ?? undefined,
            mcTotFxdCst: values.mcTotFxdCst ?? undefined,
            mcBobbinPerTrolly: values.mcBobbinPerTrolly ?? undefined,
            mcBoxCost: values.mcBoxCost ?? undefined,
            mcCaptivePerBobbin: values.mcCaptivePerBobbin ?? undefined,
            mcWeightage: values.mcWeightage ?? undefined,
            vb1Qty: values.vb1Qty ?? undefined,
            vb2Qty: values.vb2Qty ?? undefined,
            vb3Qty: values.vb3Qty ?? undefined,
            vb4Qty: values.vb4Qty ?? undefined,
            vb5Qty: values.vb5Qty ?? undefined,
            notes: values.notes,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          machineCode: values.machineCode,
          machineName: values.machineName,
          mcType: values.mcType || "",
          mcLocation: values.mcLocation || "",
          noOfPosition: values.noOfPosition,
          noOfEnd: values.noOfEnd,
          mcSpeed: values.mcSpeed,
          mcEfficiency: values.mcEfficiency,
          machineRpm: values.machineRpm ?? undefined,
          powerPerDay: values.powerPerDay ?? undefined,
          mpPerDay: values.mpPerDay ?? undefined,
          ohsPerDay: values.ohsPerDay ?? undefined,
          sparesPerDay: values.sparesPerDay ?? undefined,
          kgsLostChange: values.kgsLostChange ?? undefined,
          mcPoyBobbinWeight: values.mcPoyBobbinWeight ?? undefined,
          mcTotFxdCst: values.mcTotFxdCst ?? undefined,
          mcBobbinPerTrolly: values.mcBobbinPerTrolly ?? undefined,
          mcBoxCost: values.mcBoxCost ?? undefined,
          mcCaptivePerBobbin: values.mcCaptivePerBobbin ?? undefined,
          mcWeightage: values.mcWeightage ?? undefined,
          vb1Qty: values.vb1Qty ?? undefined,
          vb2Qty: values.vb2Qty ?? undefined,
          vb3Qty: values.vb3Qty ?? undefined,
          vb4Qty: values.vb4Qty ?? undefined,
          vb5Qty: values.vb5Qty ?? undefined,
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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Machine" : "Add Machine"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update machine details." : "Create a new machine master record."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="machineCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="BT-D" disabled={isEditing || isPending}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="machineName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Barmag DTY Line D" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mcType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DTY / POY / FDY" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mcLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Plant A / Floor 2" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noOfPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Positions</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" step="1" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noOfEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="1" step="1" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mcSpeed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speed (m/min)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" step="any" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mcEfficiency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efficiency (%)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" max="100" step="any" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="machineRpm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine RPM <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g., 3000"
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="powerPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Power/Day (USD) <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g., 120.00"
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Costs & Volume Buckets */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Costs &amp; Volume Buckets (auto-fill source)</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="mpPerDay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manpower / Day (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="e.g. 85.00" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ohsPerDay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overhead / Head / Day (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="e.g. 12.50" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sparesPerDay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spares / Day (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="e.g. 5.00" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="kgsLostChange" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change-Over Loss (kg)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="e.g. 2.5" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-3 mb-2">Volume Bucket Qty Thresholds (kg)</p>
              <div className="grid grid-cols-5 gap-2">
                {(["vb1Qty", "vb2Qty", "vb3Qty", "vb4Qty", "vb5Qty"] as const).map((name, i) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel>VB{i + 1}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="0" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </div>
            </div>

            {/* Oracle Machine Data */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Oracle Machine Data</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="mcPoyBobbinWeight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>POY Bobbin Weight (kg) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mcTotFxdCst" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Fixed Cost <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mcBobbinPerTrolly" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bobbin Per Trolley <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mcBoxCost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Box Cost <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mcCaptivePerBobbin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Captive Per Bobbin <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mcWeightage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weightage <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

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
                      <FormDescription>Inactive machines are excluded from costing.</FormDescription>
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
