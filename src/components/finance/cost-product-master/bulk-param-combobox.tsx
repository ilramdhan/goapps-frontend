"use client"

// BulkParamCombobox — picks a global mst_parameter entry (by code/name), used
// by bulk-edit-params-dialog.tsx's Set-value section. Product-agnostic: unlike
// use-cost-product-parameter.ts's useAvailableParams(productSysId) (which is
// scoped to one product's current applicability gap), bulk operations target
// an arbitrary set of products with potentially different applicability sets,
// so this sources from the plain master Parameter list (useParameters) — the
// same list the "Finance > Master > Parameter" page uses.
//
// Both the single-select combobox and the multi-select variant
// (BulkParamMultiCombobox, used by the Remove section) exclude CALCULATED and
// MASTER_LOOKUP category params — see EXCLUDED_BULK_PARAM_CATEGORIES below —
// per the bulk-simplify-attach-flexible design doc: CALCULATED params are
// server-engine-filled (bulk-setting them would be silently overwritten at
// next calc) and MASTER_LOOKUP params drive a fill-group cascade to child
// params that a flat bulk-set/remove would bypass, leaving data inconsistent.
import { useQueries } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useParameters } from "@/hooks/finance/use-parameter"
import { normalizeRequiredEntry, type RequiredParamEntry } from "@/types/finance/cost-product-parameter"
import { ParamCategory } from "@/types/finance/parameter"
import type { Parameter } from "@/types/finance/parameter"
import { cn } from "@/lib/utils"

/** Categories hidden from every bulk param picker — see file header comment. */
const EXCLUDED_BULK_PARAM_CATEGORIES: ReadonlySet<ParamCategory> = new Set([
  ParamCategory.PARAM_CATEGORY_CALCULATED,
  ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP,
])

function useBulkPickableParams(search: string) {
  const { data, isLoading } = useParameters({ search, activeFilter: 1, pageSize: 50 })
  const items = useMemo(
    () => (data?.data ?? []).filter((p: Parameter) => !EXCLUDED_BULK_PARAM_CATEGORIES.has(p.paramCategory)),
    [data],
  )
  return { items, isLoading }
}

// Union of paramIds actually applicable/present on at least one of the given
// products — reuses the same endpoint/query-key namespace as the product
// detail Parameters tab's useProductRequiredParams (use-cost-product-parameter.ts),
// so the cache is shared, just fanned out across multiple productSysIds via
// useQueries instead of a single id.
function useSelectedProductsApplicableParamIds(productSysIds: number[]) {
  const results = useQueries({
    queries: productSysIds
      .filter((id) => id > 0)
      .map((productSysId) => ({
        queryKey: ["finance", "cost-product-parameter", "product", productSysId, { requiredOnly: false }],
        queryFn: async (): Promise<RequiredParamEntry[]> => {
          const qs = new URLSearchParams({ requiredOnly: "false" }).toString()
          const res = await fetch(`/api/v1/finance/cost-product-parameters/products/${productSysId}?${qs}`)
          if (!res.ok) throw new Error("Failed to load product params")
          const body = await res.json()
          return ((body.data ?? []) as Array<Record<string, unknown>>).map(normalizeRequiredEntry)
        },
        staleTime: 30_000,
      })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const paramIds = useMemo(() => {
    const set = new Set<string>()
    for (const r of results) {
      for (const p of r.data ?? []) set.add(p.paramId)
    }
    return set
  }, [results])

  return { paramIds, isLoading }
}

// Pickable list for the Remove section — the global catalog (category-excluded,
// same as the Set-value picker) intersected with the union of params actually
// applicable on at least one selected product, so users can't be offered a
// "remove" for a param no selected product even has.
function useBulkRemovablePickableParams(productSysIds: number[], search: string) {
  const { items: catalog, isLoading: catalogLoading } = useBulkPickableParams(search)
  const { paramIds, isLoading: applicableLoading } = useSelectedProductsApplicableParamIds(productSysIds)
  const items = useMemo(() => catalog.filter((p) => paramIds.has(p.paramId)), [catalog, paramIds])
  return { items, isLoading: catalogLoading || applicableLoading }
}

function paramLabel(p: Parameter) {
  return `${p.paramCode} — ${p.paramName}`
}

// ============================================================================
// Single-select (Set-value section)
// ============================================================================

interface BulkParamComboboxProps {
  value: string | undefined
  onChange: (param: Parameter) => void
  /** Param ids to hide from the list on top of the category exclusion (e.g. already-picked-elsewhere guard). */
  excludeParamIds?: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BulkParamCombobox({
  value,
  onChange,
  excludeParamIds,
  placeholder = "Select parameter…",
  disabled,
  className,
}: BulkParamComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { items: allItems, isLoading } = useBulkPickableParams(search)
  const excluded = useMemo(() => new Set(excludeParamIds ?? []), [excludeParamIds])
  const items = useMemo(() => allItems.filter((p) => !excluded.has(p.paramId)), [allItems, excluded])
  const selected = useMemo(() => allItems.find((p) => p.paramId === value), [allItems, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="truncate">
              <span className="text-muted-foreground">{selected.paramCode}</span> — {selected.paramName}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search parameters…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No parameter matches.</CommandEmpty>
            <CommandGroup>
              {items.map((p) => (
                <CommandItem
                  key={p.paramId}
                  value={paramLabel(p)}
                  onSelect={() => {
                    onChange(p)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.paramId ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-xs mr-2 text-muted-foreground">{p.paramCode}</span>
                  <span className="truncate">{p.paramName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Multi-select (Remove section) — picker + removable chips
// ============================================================================

interface BulkParamMultiComboboxProps {
  /** Currently selected params, rendered as removable chips below the trigger. */
  value: Parameter[]
  onChange: (params: Parameter[]) => void
  /**
   * Products the picker is scoped to — only params applicable/present on at
   * least one of these are offered (union), on top of the category exclusion.
   */
  productSysIds: number[]
  /** Param ids to hide from the picker list on top of the category exclusion (e.g. already-picked-elsewhere guard). */
  excludeParamIds?: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BulkParamMultiCombobox({
  value,
  onChange,
  productSysIds,
  excludeParamIds,
  placeholder = "Select parameters…",
  disabled,
  className,
}: BulkParamMultiComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { items: allItems, isLoading } = useBulkRemovablePickableParams(productSysIds, search)
  const selectedIds = useMemo(() => new Set(value.map((p) => p.paramId)), [value])
  const externallyExcluded = useMemo(() => new Set(excludeParamIds ?? []), [excludeParamIds])
  const items = useMemo(
    () => allItems.filter((p) => !externallyExcluded.has(p.paramId)),
    [allItems, externallyExcluded],
  )

  function toggle(p: Parameter) {
    if (selectedIds.has(p.paramId)) {
      onChange(value.filter((v) => v.paramId !== p.paramId))
    } else {
      onChange([...value, p])
    }
  }

  function remove(paramId: string) {
    onChange(value.filter((v) => v.paramId !== paramId))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {value.length > 0 ? `${value.length} parameter${value.length === 1 ? "" : "s"} selected` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search parameters…" value={search} onValueChange={setSearch} />
            <CommandList>
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              <CommandEmpty>
                {!isLoading && items.length === 0
                  ? "No parameters are applicable on the selected products."
                  : "No parameter matches."}
              </CommandEmpty>
              <CommandGroup>
                {items.map((p) => (
                  <CommandItem key={p.paramId} value={paramLabel(p)} onSelect={() => toggle(p)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", selectedIds.has(p.paramId) ? "opacity-100" : "opacity-0")}
                    />
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{p.paramCode}</span>
                    <span className="truncate">{p.paramName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p) => (
            <Badge key={p.paramId} variant="secondary" className="gap-1 font-normal">
              <span className="font-mono text-[10px] text-muted-foreground">{p.paramCode}</span>
              {p.paramName}
              <button
                type="button"
                onClick={() => remove(p.paramId)}
                disabled={disabled}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                aria-label={`Remove ${p.paramName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
