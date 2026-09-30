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

import type { ProductGrade } from "@/types/finance/product-grade"
import { useCreateProductGrade, useUpdateProductGrade } from "@/hooks/finance/use-product-grade"

const baseProductGradeFormFields = {
  pgName: z.string().min(1, "Name is required").max(100),
  pgDescription: z.string().max(500).optional(),
  bcPerc: z.coerce.number().min(0).max(100),
  nonStdPerc: z.coerce.number().min(0).max(100),
  bcRecoveryRate: z.coerce.number().min(0).max(1),
  pgDetailProduct: z.string().max(100).optional(),
  pgGradeLabel: z.string().max(50).optional(),
  stdSellingPrice: z.coerce.number().min(0).default(0),
  spValue: z.coerce.number().min(0).default(0),
  lossPct: z.coerce.number().min(0).optional().nullable(),
  seqNo:   z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean(),
}

const createFormSchema = z.object({
  pgCode: z
    .string()
    .min(1, "Code is required")
    .max(10)
    .regex(/^[A-Z][A-Z0-9]*$/, "Uppercase letters and digits only"),
  ...baseProductGradeFormFields,
})

const updateFormSchema = z.object({
  pgCode: z.string().min(1, "Code is required"),
  ...baseProductGradeFormFields,
})

type FormValues = z.infer<typeof createFormSchema>

interface ProductGradeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productGrade?: ProductGrade | null
  onSuccess?: () => void
}

export function ProductGradeFormDialog({ open, onOpenChange, productGrade, onSuccess }: ProductGradeFormDialogProps) {
  const isEditing = !!productGrade
  const createMutation = useCreateProductGrade()
  const updateMutation = useUpdateProductGrade()

  const form = useForm<FormValues>({
    resolver: zodResolver(isEditing ? updateFormSchema : createFormSchema) as never,
    defaultValues: {
      pgCode: "", pgName: "", pgDescription: "", bcPerc: 0, nonStdPerc: 0, bcRecoveryRate: 0.85, pgDetailProduct: "", pgGradeLabel: "", stdSellingPrice: 0, spValue: 0, lossPct: null, seqNo: null, notes: "", isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        productGrade
          ? {
              pgCode: productGrade.pgCode,
              pgName: productGrade.pgName,
              pgDescription: productGrade.pgDescription || "",
              bcPerc: productGrade.bcPerc ?? 0,
              nonStdPerc: productGrade.nonStdPerc ?? 0,
              bcRecoveryRate: productGrade.bcRecoveryRate ?? 0.85,
              pgDetailProduct: productGrade.pgDetailProduct ?? "",
              pgGradeLabel: productGrade.pgGradeLabel ?? "",
              stdSellingPrice: productGrade.stdSellingPrice ?? 0,
              spValue: productGrade.spValue ?? 0,
              lossPct: productGrade.lossPct ?? null,
              seqNo:   productGrade.seqNo ?? null,
              notes: productGrade.notes || "",
              isActive: productGrade.isActive ?? true,
            }
          : { pgCode: "", pgName: "", pgDescription: "", bcPerc: 0, nonStdPerc: 0, bcRecoveryRate: 0.85, pgDetailProduct: "", pgGradeLabel: "", stdSellingPrice: 0, spValue: 0, lossPct: null, seqNo: null, notes: "", isActive: true }
      )
    }
  }, [open, productGrade, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && productGrade) {
        await updateMutation.mutateAsync({
          id: productGrade.pgId,
          data: {
            pgId: productGrade.pgId,
            pgName: values.pgName,
            pgDescription: values.pgDescription,
            bcPerc: values.bcPerc,
            nonStdPerc: values.nonStdPerc,
            bcRecoveryRate: values.bcRecoveryRate,
            pgDetailProduct: (values.pgDetailProduct || undefined) as unknown as string,
            pgGradeLabel: (values.pgGradeLabel || undefined) as unknown as string,
            stdSellingPrice: values.stdSellingPrice,
            spValue: values.spValue,
            lossPct: values.lossPct ?? undefined,
            seqNo:   values.seqNo != null ? values.seqNo : undefined,
            notes: values.notes,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          pgCode: values.pgCode,
          pgName: values.pgName,
          pgDescription: values.pgDescription || "",
          bcPerc: values.bcPerc,
          nonStdPerc: values.nonStdPerc,
          bcRecoveryRate: values.bcRecoveryRate,
          pgDetailProduct: (values.pgDetailProduct || undefined) as unknown as string,
          pgGradeLabel: (values.pgGradeLabel || undefined) as unknown as string,
          stdSellingPrice: values.stdSellingPrice,
          spValue: values.spValue,
          lossPct: values.lossPct ?? undefined,
          seqNo:   values.seqNo != null ? values.seqNo : undefined,
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product Grade" : "Add Product Grade"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update grade details." : "Create a new yarn product grade."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pgCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A / B / AA" disabled={isEditing || isPending}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pgName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Grade A" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bcPerc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BC % <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" min="0" max="100" disabled={isPending} />
                    </FormControl>
                    <FormDescription>% output as BC grade</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nonStdPerc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Non-Std %</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" min="0" max="100" disabled={isPending} />
                    </FormControl>
                    <FormDescription>% output as non-standard</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bcRecoveryRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BC Recovery Rate</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="any" min="0" max="1" placeholder="0.85" disabled={isPending} />
                    </FormControl>
                    <FormDescription>0–1 (e.g. 0.85 = 85%)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Grade Lookup Fields</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pgDetailProduct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detail Product Pattern</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='e.g. "DBR <=600D"' disabled={isPending} />
                      </FormControl>
                      <FormDescription>Oracle CMPG_DETAIL_PRODUCT match key</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pgGradeLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Label</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='e.g. "Type 7 NS"' disabled={isPending} />
                      </FormControl>
                      <FormDescription>Grade display label (legacy; no longer copied to a param)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stdSellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Std Selling Price (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" min="0" disabled={isPending} />
                      </FormControl>
                      <FormDescription>Auto-fills STD_SP_AX (via BC_LOSS_TYPE)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SP Value (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" min="0" disabled={isPending} />
                      </FormControl>
                      <FormDescription>Auto-fills STD_SP_BC → BC V-Loss = (cost before QLoss − STD_SP_BC) × (B+C)/100</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lossPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loss Factor <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>Auto-fills NS_LOSS → NS V-Loss = (AE+A9+A)/100 × NS_LOSS</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seqNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sequence No. <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>Display order</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="pgDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional description" disabled={isPending} />
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
                      <FormDescription>Inactive grades are excluded from costing.</FormDescription>
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
