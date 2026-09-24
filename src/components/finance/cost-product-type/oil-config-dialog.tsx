"use client"

// OilConfigDialog — per product-type oil config (D10): which oil class
// (PTY/POY/SUPERBA, or none) the type belongs to, and which RM groups
// (is_oil_group=true) are allowed as OIL_NAME values for its products, with
// exactly one marked as the default mapping.
import { useEffect, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useCostProductTypeOilConfig,
  useSetCostProductTypeOilConfig,
  type CostProductTypeOilGroupRow,
} from "@/hooks/finance/use-cost-product-type-oil-config"
import { useMasterLookupOptions } from "@/hooks/finance/use-master-lookup"
import type { CostProductType } from "@/types/finance/cost-product-type"

const OIL_CLASS_OPTIONS = [
  { value: "", label: "Not an oil product type" },
  { value: "PTY", label: "PTY" },
  { value: "POY", label: "POY" },
  { value: "SUPERBA", label: "SUPERBA" },
]

const groupRowSchema = z.object({
  groupCode: z.string().min(1),
  groupName: z.string(),
  isDefault: z.boolean(),
})

export const oilConfigFormSchema = z
  .object({
    oilClass: z.enum(["", "PTY", "POY", "SUPERBA"]),
    groups: z.array(groupRowSchema),
  })
  .superRefine((val, ctx) => {
    if (val.oilClass) {
      if (val.groups.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select at least one allowed RM group",
          path: ["groups"],
        })
        return
      }
      const defaults = val.groups.filter((g) => g.isDefault).length
      if (defaults !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exactly one allowed group must be marked as default",
          path: ["groups"],
        })
      }
    } else if (val.groups.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clear allowed groups when no oil class is set",
        path: ["groups"],
      })
    }
  })

export type OilConfigFormValues = z.infer<typeof oilConfigFormSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  productType: CostProductType | null
}

export function OilConfigDialog({ open, onOpenChange, productType }: Props) {
  const typeId = productType?.typeId
  const { data: config, isLoading: configLoading } = useCostProductTypeOilConfig(open ? typeId : undefined)
  const setMutation = useSetCostProductTypeOilConfig()

  const form = useForm<OilConfigFormValues>({
    resolver: zodResolver(oilConfigFormSchema) as never,
    defaultValues: { oilClass: "", groups: [] },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      oilClass: (config?.oilClass as OilConfigFormValues["oilClass"]) || "",
      groups: config?.groups ?? [],
    })
  }, [open, config, form])

  const oilClass = form.watch("oilClass")
  const groups = form.watch("groups")

  // RM_GROUP_OIL lookup master — all RM groups flagged is_oil_group=true
  // (D3/D11), independent of product type; the allow-list below is what
  // narrows that full list down to this type's oil class.
  const { data: allOilGroups = [], isLoading: optionsLoading } = useMasterLookupOptions(
    "RM_GROUP_OIL",
    open,
    "",
    500,
  )

  const selectedByCode = useMemo(() => {
    const map = new Map<string, CostProductTypeOilGroupRow>()
    for (const g of groups) map.set(g.groupCode, g)
    return map
  }, [groups])

  function toggleGroup(code: string, label: string, checked: boolean) {
    if (checked) {
      const next = [...groups, { groupCode: code, groupName: label, isDefault: groups.length === 0 }]
      form.setValue("groups", next, { shouldValidate: true })
    } else {
      const next = groups.filter((g) => g.groupCode !== code)
      form.setValue("groups", next, { shouldValidate: true })
    }
  }

  function setDefault(code: string) {
    const next = groups.map((g) => ({ ...g, isDefault: g.groupCode === code }))
    form.setValue("groups", next, { shouldValidate: true })
  }

  async function onSubmit(values: OilConfigFormValues) {
    if (!typeId) return
    try {
      await setMutation.mutateAsync({ typeId, oilClass: values.oilClass, groups: values.groups })
      onOpenChange(false)
    } catch {
      /* toast in hook */
    }
  }

  const groupsError = form.formState.errors.groups?.message ?? form.formState.errors.groups?.root?.message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Oil config — {productType?.typeCode}</DialogTitle>
          <DialogDescription>
            Set the oil class and the RM groups allowed as OIL_NAME values for products of this type.
          </DialogDescription>
        </DialogHeader>

        <form id="oil-config-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Oil class</Label>
            <Select
              value={oilClass}
              onValueChange={(v) => {
                form.setValue("oilClass", v as OilConfigFormValues["oilClass"], { shouldValidate: true })
                if (!v) form.setValue("groups", [], { shouldValidate: true })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OIL_CLASS_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "none"} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {oilClass && (
            <div className="space-y-1.5">
              <Label>Allowed RM groups (pick one default)</Label>
              {(configLoading || optionsLoading) ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : allOilGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No RM groups are flagged as oil groups yet — enable &quot;Oil Group&quot; on an RM
                  group first.
                </p>
              ) : (
                <RadioGroup
                  value={groups.find((g) => g.isDefault)?.groupCode ?? ""}
                  onValueChange={setDefault}
                  className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2"
                >
                  {allOilGroups.map((opt) => {
                    const row = selectedByCode.get(opt.value)
                    const checked = !!row
                    return (
                      <div key={opt.value} className="flex items-center gap-3 rounded px-1 py-1 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleGroup(opt.value, opt.label, v === true)}
                        />
                        <span className="flex-1 truncate">
                          <span className="font-mono text-xs">{opt.value}</span> — {opt.label}
                        </span>
                        <RadioGroupItem value={opt.value} disabled={!checked} aria-label={`Default: ${opt.label}`} />
                      </div>
                    )
                  })}
                </RadioGroup>
              )}
              {groupsError && (
                <p className="text-xs font-medium text-destructive">{String(groupsError)}</p>
              )}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="oil-config-form" disabled={setMutation.isPending}>
            {setMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
