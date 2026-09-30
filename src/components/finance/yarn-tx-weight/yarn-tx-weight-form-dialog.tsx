"use client"

import { useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import {
  ScrollableDialogBody,
  ScrollableDialogContent,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
} from "@/components/common/scrollable-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
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

import { ProductTypeMultiSelect } from "@/components/finance/yarn-tx-weight/product-type-multi-select"
import { useCostProductTypes } from "@/hooks/finance/use-cost-product-type"
import {
  useCreateYarnTxWeightGroup,
  useUpdateYarnTxWeightGroup,
  useYarnTxWeightGroups,
} from "@/hooks/finance/use-yarn-tx-weight"
import {
  TX_WEIGHT_FALLBACK_LABEL,
  TX_WEIGHT_MODE_OPTIONS,
  buildProductTypeOwnerMap,
  formatTxWeightPreview,
  fromRuleFormRows,
  toRuleFormRows,
  type TxWeightProductTypeRef,
  type YarnTxWeightGroup,
} from "@/types/finance/yarn-tx-weight"

const NONE = "none"

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(30)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Uppercase letters, digits, underscores only (start with a letter)"),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().max(200).optional(),
  productTypeIds: z.array(z.number().int().min(1)).min(1, "Select at least one product type"),
  rules: z
    .array(
      z.object({
        grade: z.enum(["AE", "A9", "A", "B", "C"]),
        mode: z.enum(["LESS_BY", "MULTIPLY", "FIXED", ""]),
        value: z.coerce.number().finite("Value must be a number"),
      })
    )
    .length(5)
    .refine((rows) => rows.some((r) => r.mode !== ""), "Set a mode for at least one grade"),
})

type FormValues = z.infer<typeof formSchema>

function emptyValues(): FormValues {
  return { code: "", name: "", description: "", productTypeIds: [], rules: toRuleFormRows() }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: YarnTxWeightGroup | null
}

export function YarnTxWeightFormDialog({ open, onOpenChange, group }: Props) {
  const isEditing = !!group
  const createMutation = useCreateYarnTxWeightGroup()
  const updateMutation = useUpdateYarnTxWeightGroup()

  const { data: productTypesData, isLoading: productTypesLoading } = useCostProductTypes({
    activeFilter: "all",
    sortBy: "type_code",
    sortOrder: "asc",
    page: 1,
    pageSize: 100,
  })
  // All configs, to know which product types another config already owns.
  const { data: allGroupsData, isLoading: groupsLoading } = useYarnTxWeightGroups(
    { page: 1, pageSize: 100, sortBy: "code", sortOrder: "asc" },
    { enabled: open }
  )

  const owners = useMemo(
    () => buildProductTypeOwnerMap(allGroupsData?.items ?? [], group?.groupId),
    [allGroupsData, group]
  )

  const productTypeOptions = useMemo<TxWeightProductTypeRef[]>(() => {
    const opts = (productTypesData?.items ?? []).map((pt) => ({ id: pt.typeId, code: pt.typeCode, name: pt.typeName }))
    // Keep already-mapped types selectable even if the product type list misses them.
    for (const pt of group?.productTypes ?? []) {
      if (!opts.some((o) => o.id === pt.id)) opts.push(pt)
    }
    return opts
  }, [productTypesData, group])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (open) {
      form.reset(
        group
          ? {
              code: group.code,
              name: group.name,
              description: group.description || "",
              productTypeIds: group.productTypes.map((pt) => pt.id),
              rules: toRuleFormRows(group.rules),
            }
          : emptyValues()
      )
    }
  }, [open, group, form])

  const isPending = createMutation.isPending || updateMutation.isPending
  const watchedRules = useWatch({ control: form.control, name: "rules" })
  const rulesError = form.formState.errors.rules

  async function onSubmit(values: FormValues) {
    const data = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description || "",
      productTypeIds: values.productTypeIds,
      rules: fromRuleFormRows(values.rules, group?.rules),
    }
    try {
      if (isEditing && group) {
        await updateMutation.mutateAsync({ groupId: group.groupId, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[640px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit TX Weight Config" : "Add TX Weight Config"}</DialogTitle>
          <DialogDescription>
            One set of grade weight rules shared by the selected product types. Grades without a mode use the ratio
            fallback AX_WT × grade% ÷ AX%.
          </DialogDescription>
        </ScrollableDialogHeader>

        <ScrollableDialogBody>
          <Form {...form}>
            <form id="yarn-tx-weight-group-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., TTY"
                          maxLength={30}
                          disabled={isPending}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={100} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Optional" maxLength={200} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productTypeIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Types <span className="text-destructive">*</span></FormLabel>
                    <ProductTypeMultiSelect
                      options={productTypeOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      owners={owners}
                      loading={productTypesLoading || groupsLoading}
                      disabled={isPending}
                    />
                    <FormDescription>
                      A product type belongs to at most one config; types used by another config are disabled.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Grade Rules <span className="text-destructive">*</span></p>
                <div className="rounded-md border overflow-x-auto">
                  <div className="min-w-[480px] divide-y">
                    {(watchedRules ?? []).map((row, i) => (
                      <div
                        key={row.grade}
                        className="grid grid-cols-[48px_minmax(0,1fr)_120px_120px] items-center gap-3 px-3 py-2"
                      >
                        <span className="font-mono text-xs font-semibold">{row.grade}</span>
                        <FormField
                          control={form.control}
                          name={`rules.${i}.mode`}
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                value={field.value || NONE}
                                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                                disabled={isPending}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9" aria-label={`${row.grade} mode`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={NONE}>{TX_WEIGHT_FALLBACK_LABEL}</SelectItem>
                                  {TX_WEIGHT_MODE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                      {o.label} ({o.hint})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`rules.${i}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  className="h-9"
                                  aria-label={`${row.grade} value`}
                                  disabled={isPending || !row.mode}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {row.mode
                            ? formatTxWeightPreview(row.mode, Number.isFinite(Number(row.value)) ? Number(row.value) : 0)
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {rulesError?.root?.message && (
                  <p className="text-sm text-destructive">{rulesError.root.message}</p>
                )}
                {rulesError?.message && <p className="text-sm text-destructive">{rulesError.message}</p>}
              </div>
            </form>
          </Form>
        </ScrollableDialogBody>

        <ScrollableDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="yarn-tx-weight-group-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </Dialog>
  )
}
