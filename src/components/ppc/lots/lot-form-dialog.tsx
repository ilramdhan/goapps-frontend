"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"

import type { LotMaster, LotSpec } from "@/types/ppc/master"
import { LOT_SOURCE_MMSMERGE } from "@/types/ppc/master"
import { useCreateLotMaster, useUpdateLotMaster } from "@/hooks/ppc/use-masters"

interface LotFormValues {
  lotNo: string
  itemCode: string
  shadeCode: string
  stdWeightFull: string
  stdWeightUnfull: string
  notes: string
  // Spec — source-owned but PPC-correctable; the sync merges with COALESCE so
  // a correction here survives the next run.
  prodType: string
  yarnType: string
  denier: string
  filament: string
  crossSection: string
  qcGrade: string
  description: string
  shadeColor: string
  tareBoxWeight: string
  tareBobbinWeight: string
  bobbinsPerBox: string
  sourceBobWeight: string
  orionItemCode: string
  machineNo: string
  efficiencyPct: string
}

const EMPTY_VALUES: LotFormValues = {
  lotNo: "",
  itemCode: "",
  shadeCode: "",
  stdWeightFull: "",
  stdWeightUnfull: "",
  notes: "",
  prodType: "",
  yarnType: "",
  denier: "",
  filament: "",
  crossSection: "",
  qcGrade: "",
  description: "",
  shadeColor: "",
  tareBoxWeight: "",
  tareBobbinWeight: "",
  bobbinsPerBox: "",
  sourceBobWeight: "",
  orionItemCode: "",
  machineNo: "",
  efficiencyPct: "",
}

const numericString = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Must be a number")

const countString = z
  .string()
  .refine(
    (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0),
    "Must be a whole number"
  )

// PPC wires no ValidationInterceptor, so these client-side bounds are the only
// enforcement of the proto buf.validate rules — keep them in step with the proto.
const formSchema = z.object({
  lotNo: z.string().min(1, "Lot no is required").max(30, "Max 30 characters"),
  itemCode: z.string().min(1, "Item code is required").max(30, "Max 30 characters"),
  shadeCode: z.string().max(20, "Max 20 characters"),
  stdWeightFull: numericString,
  stdWeightUnfull: numericString,
  notes: z.string().max(500, "Max 500 characters"),
  prodType: z.string().max(15, "Max 15 characters"),
  yarnType: z.string().max(30, "Max 30 characters"),
  denier: z.string().max(30, "Max 30 characters"),
  filament: countString,
  crossSection: z.string().max(15, "Max 15 characters"),
  qcGrade: z.string().max(15, "Max 15 characters"),
  description: z.string().max(200, "Max 200 characters"),
  shadeColor: z.string().max(60, "Max 60 characters"),
  tareBoxWeight: numericString,
  tareBobbinWeight: numericString,
  bobbinsPerBox: countString,
  sourceBobWeight: numericString,
  orionItemCode: z.string().max(30, "Max 30 characters"),
  machineNo: z.string().max(30, "Max 30 characters"),
  efficiencyPct: countString,
})

function optionalCount(v: string): number | undefined {
  return v === "" ? undefined : Number(v)
}

function toSpec(values: LotFormValues): LotSpec {
  return {
    prodType: values.prodType,
    yarnType: values.yarnType,
    denier: values.denier,
    filament: optionalCount(values.filament),
    crossSection: values.crossSection,
    qcGrade: values.qcGrade,
    description: values.description,
    shadeColor: values.shadeColor,
    tareBoxWeight: values.tareBoxWeight,
    tareBobbinWeight: values.tareBobbinWeight,
    bobbinsPerBox: optionalCount(values.bobbinsPerBox),
    sourceBobWeight: values.sourceBobWeight,
    orionItemCode: values.orionItemCode,
    machineNo: values.machineNo,
    efficiencyPct: optionalCount(values.efficiencyPct),
    // Status flags are read-only provenance: the packing rules key off them, so
    // the form round-trips them untouched instead of exposing them for editing.
    sourceStatus: "",
    sourcePakStatus: "",
  }
}

function fromLot(lot: LotMaster): LotFormValues {
  const s = lot.spec
  return {
    lotNo: lot.lotNo || "",
    itemCode: lot.itemCode || "",
    shadeCode: lot.shadeCode || "",
    stdWeightFull: lot.stdWeightFull || "",
    stdWeightUnfull: lot.stdWeightUnfull || "",
    notes: lot.notes || "",
    prodType: s?.prodType || "",
    yarnType: s?.yarnType || "",
    denier: s?.denier || "",
    filament: s?.filament != null ? String(s.filament) : "",
    crossSection: s?.crossSection || "",
    qcGrade: s?.qcGrade || "",
    description: s?.description || "",
    shadeColor: s?.shadeColor || "",
    tareBoxWeight: s?.tareBoxWeight || "",
    tareBobbinWeight: s?.tareBobbinWeight || "",
    bobbinsPerBox: s?.bobbinsPerBox != null ? String(s.bobbinsPerBox) : "",
    sourceBobWeight: s?.sourceBobWeight || "",
    orionItemCode: s?.orionItemCode || "",
    machineNo: s?.machineNo || "",
    efficiencyPct: s?.efficiencyPct != null ? String(s.efficiencyPct) : "",
  }
}

interface LotFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lot?: LotMaster | null
}

export function LotFormDialog({ open, onOpenChange, lot }: LotFormDialogProps) {
  const isEditing = !!lot
  const isSourced = lot?.source === LOT_SOURCE_MMSMERGE
  const createMutation = useCreateLotMaster()
  const updateMutation = useUpdateLotMaster()

  const form = useForm<LotFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(lot ? fromLot(lot) : EMPTY_VALUES)
    }
  }, [open, lot, form])

  const onSubmit = async (values: LotFormValues) => {
    try {
      if (isEditing && lot) {
        await updateMutation.mutateAsync({
          id: lot.lotNo,
          data: {
            lotNo: lot.lotNo,
            itemCode: values.itemCode,
            shadeCode: values.shadeCode,
            stdWeightFull: values.stdWeightFull || "0",
            stdWeightUnfull: values.stdWeightUnfull || "0",
            notes: values.notes,
            spec: toSpec(values),
          },
        })
      } else {
        await createMutation.mutateAsync({
          lotNo: values.lotNo,
          itemCode: values.itemCode,
          shadeCode: values.shadeCode,
          stdWeightFull: values.stdWeightFull || "0",
          stdWeightUnfull: values.stdWeightUnfull || "0",
          notes: values.notes,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save lot:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[640px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit Lot" : "Add Lot"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? isSourced
                ? "This lot was imported from Oracle. Corrections you make here are preserved by the next sync."
                : "Update the lot details. Lot no cannot be changed."
              : "Create a new lot. The yarn specification is filled in by the Oracle sync."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <ScrollableDialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="lotNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot No</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., L2607-0012"
                        {...field}
                        value={field.value || ""}
                        disabled={isEditing || isPending}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="itemCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., PTY-150-48"
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
                  name="shadeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., NL"
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
                  name="stdWeightFull"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Std Weight Full (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g., 12.5"
                          {...field}
                          value={field.value || ""}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>Standard weight of a full doff.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stdWeightUnfull"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Std Weight Unfull (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g., 6.25"
                          {...field}
                          value={field.value || ""}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Unfull defaults to half the full weight — an estimate, not a measured
                        figure. Correct it here when the real doff weight is known.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEditing && (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Yarn specification
                  </p>

                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3 [&>*]:min-w-0">
                    <FormField
                      control={form.control}
                      name="prodType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prod Type</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="PTY"
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
                      name="yarnType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yarn Type</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., DTY"
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
                      name="qcGrade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>QC Grade</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., AA"
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

                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3 [&>*]:min-w-0">
                    <FormField
                      control={form.control}
                      name="denier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Denier</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 150"
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
                      name="filament"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Filament</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              placeholder="e.g., 48"
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
                      name="crossSection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cross Section</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="RND"
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
                      name="shadeColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shade Colour</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Natural"
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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Optional — free-text description"
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

                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3 [&>*]:min-w-0">
                    <FormField
                      control={form.control}
                      name="tareBoxWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tare Box (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 1.2"
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
                      name="tareBobbinWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tare Bobbin (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 0.35"
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
                      name="bobbinsPerBox"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bobbins / Box</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              placeholder="e.g., 24"
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
                      name="sourceBobWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Bobbin Weight</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 8.4"
                              {...field}
                              value={field.value || ""}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Oracle MERGE_BOB verbatim; unit unconfirmed. Informational only after
                            the first import.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="efficiencyPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Efficiency (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              placeholder="e.g., 96"
                              {...field}
                              value={field.value || ""}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Expected machine efficiency for this lot.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                    <FormField
                      control={form.control}
                      name="orionItemCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orion Item Code</FormLabel>
                          <FormControl>
                            <Input
                              className="font-mono"
                              placeholder="e.g., 1201150048"
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
                      name="machineNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Machine No</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., TXT-07"
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
                </div>
              )}

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
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>Optional (max 500 chars)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
