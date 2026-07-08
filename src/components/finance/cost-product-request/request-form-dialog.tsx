"use client"

// RequestFormDialog — two-section product request form (FR-1).
// Section 2 (Product specification & pricing) is always visible; description+tube are
// all-or-nothing, everything else in the section is independently optional.
// NO UUID input anywhere — uses RequestTypeCombobox + a fixed Paper/Plastic Select.
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogBody,
  ScrollableDialogContent,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
} from "@/components/common/scrollable-dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ProductMasterCombobox, RequestTypeCombobox } from "@/components/finance/comboboxes"
import { useCreateCostProductRequest, useUpdateCostProductRequest } from "@/hooks/finance/use-cost-product-request"
import { TUBE_TYPE_OPTIONS, TubeType } from "@/types/finance/cost-product-request"
import type { CostProductRequest, SpecInput, UrgencyLevel } from "@/types/finance/cost-product-request"

const schema = z.object({
  requestTypeId: z.number().int().positive("Pick a request type"),
  title: z.string().min(1, "Required").max(255, "Max 255 chars"),
  description: z.string().max(10000, "Max 10000 chars"),
  customerName: z.string().min(1, "Required").max(255, "Max 255 chars"),
  customerCode: z.string().max(50, "Max 50 chars"),
  urgencyLevel: z.enum(["low", "medium", "high"]),
  neededByDate: z.string().max(10, "YYYY-MM-DD").regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  targetVolume: z.string().max(30, "Max 30 chars"),
  targetPriceRange: z.string().max(50, "Max 50 chars"),
  // Reference product (product-request-workflow-revamp D4) — optional hint pointing
  // at a similar existing product master; 0/undefined means unset.
  referenceProductSysId: z.number().int().nonnegative().optional(),
  // Spec — optional, all-or-nothing validated below in onSubmit.
  specProductDescription: z.string().max(5000, "Max 5000 chars").optional(),
  // Shade code/name are independently optional — not part of the all-or-nothing group.
  specShadeCode: z.string().max(100, "Max 100 chars").optional(),
  specShadeName: z.string().max(100, "Max 100 chars").optional(),
  // Fixed Paper/Plastic classification (product-request-workflow-revamp D3) —
  // replaces the old master-data paper tube combobox. UNSPECIFIED = not picked.
  specTubeType: z.nativeEnum(TubeType).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  request?: CostProductRequest | null
}

const DEFAULTS: FormValues = {
  requestTypeId: 0,
  title: "",
  description: "",
  customerName: "",
  customerCode: "",
  urgencyLevel: "medium",
  neededByDate: "",
  targetVolume: "",
  targetPriceRange: "",
  referenceProductSysId: undefined,
  specProductDescription: "",
  specShadeCode: "",
  specShadeName: "",
  specTubeType: TubeType.TUBE_TYPE_UNSPECIFIED,
}

export function RequestFormDialog({ open, onOpenChange, request }: Props) {
  const isEditing = !!request && request.status === "DRAFT"
  const createMutation = useCreateCostProductRequest()
  const updateMutation = useUpdateCostProductRequest()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (!open) return
    if (request) {
      form.reset({
        requestTypeId: request.requestTypeId,
        title: request.title,
        description: request.description || "",
        customerName: request.customerName,
        customerCode: request.customerCode || "",
        urgencyLevel: request.urgencyLevel,
        neededByDate: request.neededByDate || "",
        targetVolume: request.targetVolume || "",
        targetPriceRange: request.targetPriceRange || "",
        referenceProductSysId: request.referenceProductSysId || undefined,
        specProductDescription: request.spec?.productDescription || "",
        specShadeCode: request.spec?.shadeCode || "",
        specShadeName: request.spec?.shadeName || "",
        specTubeType: request.spec?.tubeType || TubeType.TUBE_TYPE_UNSPECIFIED,
      })
    } else {
      form.reset(DEFAULTS)
    }
  }, [open, request, form])

  async function onSubmit(values: FormValues) {
    // Cross-field rule: spec is all-or-nothing — either every field is filled, or none are.
    // Shade code/name are excluded from this group — both are independently optional.
    const specFieldEntries: Array<[keyof FormValues, string]> = [
      ["specProductDescription", "Fill in all spec fields, or leave all blank"],
      ["specTubeType", "Fill in all spec fields, or leave all blank"],
    ]
    const isEmpty = (v: unknown) =>
      v === undefined || v === null || v === "" || v === 0 || v === TubeType.TUBE_TYPE_UNSPECIFIED
    const filledCount = specFieldEntries.filter(([key]) => !isEmpty(values[key])).length
    if (filledCount > 0 && filledCount < specFieldEntries.length) {
      for (const [key, message] of specFieldEntries) {
        if (isEmpty(values[key])) {
          form.setError(key, { message })
        }
      }
      return
    }
    // Shade code/name never gate whether a spec is sent — they're independently
    // optional extras included alongside the description+tube all-or-nothing group.
    const hasSpec = filledCount === specFieldEntries.length
    const payload = {
      requestTypeId: values.requestTypeId,
      title: values.title,
      description: values.description,
      customerName: values.customerName,
      customerCode: values.customerCode,
      productClassification: isEditing && request ? request.productClassification : "pending",
      urgencyLevel: values.urgencyLevel as UrgencyLevel,
      neededByDate: values.neededByDate,
      targetVolume: values.targetVolume,
      targetPriceRange: values.targetPriceRange,
      referenceProductSysId: values.referenceProductSysId,
      spec: hasSpec
        ? {
            // rawMaterialType/weightPerBobbinKg/boxType removed from the form (D1) — send
            // empty so historical rows' columns stay unpopulated on new writes.
            rawMaterialType: "" as SpecInput["rawMaterialType"],
            productDescription: values.specProductDescription || "",
            shadeId: 0, // master shade not picked — using free-text fallback
            shadeCode: values.specShadeCode,
            shadeName: values.specShadeName,
            paperTubeTypeId: 0,
            tubeType: values.specTubeType ?? TubeType.TUBE_TYPE_UNSPECIFIED,
            weightPerBobbinKg: "",
            boxType: "" as SpecInput["boxType"],
          }
        : undefined,
    }
    try {
      if (isEditing && request) {
        await updateMutation.mutateAsync({ requestId: request.requestId, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      /* toast in hook */
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="max-w-3xl lg:max-w-4xl">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? `Edit ${request?.requestNo}` : "New product request"}</DialogTitle>
          <DialogDescription>
            Product specification is optional — leave it blank, or fill in every field if you have the
            details.
          </DialogDescription>
        </ScrollableDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <ScrollableDialogBody className="space-y-6">
            {/* SECTION 1 — Request Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Section 1 — Request info
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="requestTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request type *</FormLabel>
                      <FormControl>
                        <RequestTypeCombobox
                          value={field.value || undefined}
                          onChange={(typeId) => field.onChange(typeId)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgencyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Short summary of this request" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="neededByDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Needed by</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* SECTION 2 — Product Specification & Pricing (always visible; description+tube
                all-or-nothing, everything else independently optional) */}
            <section className="space-y-4 rounded-md border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Section 2 — Product specification & pricing
              </h3>
              <FormField
                control={form.control}
                name="specProductDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Free text describing the requested product" />
                    </FormControl>
                    <FormDescription>Optional — fill in if known.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="specShadeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. NL, Z114S" />
                      </FormControl>
                      <FormDescription>
                        Optional — independent of shade name. Use {`"natural"`} for unpigmented.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specShadeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Natural, Jet Black" />
                      </FormControl>
                      <FormDescription>Optional — independent of shade code.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="specTubeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tube</FormLabel>
                    <Select
                      value={String(field.value ?? TubeType.TUBE_TYPE_UNSPECIFIED)}
                      onValueChange={(v) => field.onChange(Number(v) as TubeType)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tube type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TUBE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Optional — fill in if known.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referenceProductSysId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference product (optional)</FormLabel>
                    <FormControl>
                      <ProductMasterCombobox
                        value={field.value || undefined}
                        onChange={(productSysId) => field.onChange(productSysId)}
                        placeholder="Search product by code or name…"
                      />
                    </FormControl>
                    <FormDescription>
                      If this request is similar to an existing product, pick it — its routing will be
                      suggested during review.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="targetVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target volume</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetPriceRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target price range</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
            </ScrollableDialogBody>

            <ScrollableDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save draft" : "Create request"}
              </Button>
            </ScrollableDialogFooter>
          </form>
        </Form>
      </ScrollableDialogContent>
    </Dialog>
  )
}
