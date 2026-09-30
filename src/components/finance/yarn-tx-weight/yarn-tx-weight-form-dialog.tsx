"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useCostProductTypes } from "@/hooks/finance/use-cost-product-type"
import { useCreateYarnTxWeight, useUpdateYarnTxWeight } from "@/hooks/finance/use-yarn-tx-weight"
import {
  TX_WEIGHT_GRADES,
  TX_WEIGHT_MODE_OPTIONS,
  formatTxWeightPreview,
  type YarnTxWeightRow,
} from "@/types/finance/yarn-tx-weight"

const formSchema = z.object({
  productTypeId: z.coerce.number().int().min(1, "Product type is required"),
  grade: z.enum(["AE", "A9", "A", "B", "C"], { message: "Grade is required" }),
  mode: z.enum(["LESS_BY", "MULTIPLY", "FIXED"], { message: "Mode is required" }),
  value: z.coerce.number().finite("Value must be a number"),
  description: z.string().max(200).optional(),
})

type FormValues = z.infer<typeof formSchema>

const EMPTY_VALUES = {
  productTypeId: 0,
  grade: undefined,
  mode: undefined,
  value: 0,
  description: "",
} as unknown as FormValues

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  txWeight?: YarnTxWeightRow | null
  /** Pre-selects the product type on create (e.g. the active filter). */
  defaultProductTypeId?: number
}

export function YarnTxWeightFormDialog({ open, onOpenChange, txWeight, defaultProductTypeId }: Props) {
  const isEditing = !!txWeight
  const createMutation = useCreateYarnTxWeight()
  const updateMutation = useUpdateYarnTxWeight()
  const { data: productTypesData, isLoading: productTypesLoading } = useCostProductTypes({
    activeFilter: "active",
    sortBy: "type_code",
    sortOrder: "asc",
    page: 1,
    pageSize: 100,
  })
  const productTypes = productTypesData?.items ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        txWeight
          ? ({
              productTypeId: txWeight.productTypeId,
              grade: txWeight.grade || undefined,
              mode: txWeight.mode || undefined,
              value: txWeight.value,
              description: txWeight.description || "",
            } as FormValues)
          : { ...EMPTY_VALUES, productTypeId: defaultProductTypeId ?? 0 }
      )
    }
  }, [open, txWeight, defaultProductTypeId, form])

  const isPending = createMutation.isPending || updateMutation.isPending
  const watchedMode = useWatch({ control: form.control, name: "mode" })
  const watchedValue = Number(useWatch({ control: form.control, name: "value" }))

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && txWeight) {
        await updateMutation.mutateAsync({
          id: txWeight.id,
          data: { mode: values.mode, value: values.value, description: values.description || "" },
        })
      } else {
        await createMutation.mutateAsync({
          productTypeId: values.productTypeId,
          grade: values.grade,
          mode: values.mode,
          value: values.value,
          description: values.description || "",
        })
      }
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit TX Weight Rule" : "Add TX Weight Rule"}</DialogTitle>
          <DialogDescription>
            Weight for a yarn grade, derived from the AX weight of the product.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="yarn-tx-weight-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    disabled={isEditing || isPending || productTypesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={productTypesLoading ? "Loading…" : "Select product type"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isEditing &&
                        txWeight &&
                        !productTypes.some((pt) => pt.typeId === txWeight.productTypeId) && (
                          <SelectItem value={String(txWeight.productTypeId)}>
                            {txWeight.productTypeCode} — {txWeight.productTypeName}
                          </SelectItem>
                        )}
                      {productTypes.map((pt) => (
                        <SelectItem key={pt.typeId} value={String(pt.typeId)}>
                          {pt.typeCode} — {pt.typeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade <span className="text-destructive">*</span></FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={isEditing || isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TX_WEIGHT_GRADES.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TX_WEIGHT_MODE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label} ({o.hint})
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="any" disabled={isPending} />
                  </FormControl>
                  <FormDescription>
                    Preview:{" "}
                    <span className="font-mono">
                      {formatTxWeightPreview(watchedMode ?? "", Number.isFinite(watchedValue) ? watchedValue : 0)}
                    </span>
                  </FormDescription>
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
                    <Input {...field} placeholder="Optional" maxLength={200} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="yarn-tx-weight-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
