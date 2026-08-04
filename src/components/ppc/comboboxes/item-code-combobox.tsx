"use client"

// ItemCodeCombobox — picks an Orion ERP item code.
//
// The master behind it is the finance cost product projection, whose
// `erpItemCode` is the same key the staging resolver joins on
// (UPPER(TRIM(cpm_erp_item_code)) vs the staging row's item code). Searching it
// is case-insensitive and shows the product name alongside the code, so the
// planner picks a thing rather than typing an opaque string.
//
// It also accepts a typed code verbatim. Staging rows that finance cannot match
// (NOT_FOUND) carry item codes with no product behind them — exactly the rows a
// planner most needs to filter to — and a master-only picker could never reach
// them. The typed value is offered as an explicit choice, never submitted
// silently on blur.

import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { useMemo, useState } from "react"

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
import { useProductsSearch } from "@/hooks/ppc/use-products-search"
import { cn } from "@/lib/utils"

interface ItemCodeComboboxProps {
  /** Currently selected item code, or "" for none. */
  value: string
  onChange: (itemCode: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ItemCodeCombobox({
  value,
  onChange,
  placeholder = "Any item…",
  disabled,
  className,
}: ItemCodeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useProductsSearch({ search, activeFilter: "active", pageSize: 50 })

  // One entry per distinct erp item code — several products (shades, grades)
  // can share one Orion item, and the filter is on the item, not the product.
  const items = useMemo(() => {
    const byCode = new Map<string, { code: string; label: string; extra: number }>()
    for (const p of data ?? []) {
      const code = p.erpItemCode?.trim()
      if (!code) continue
      const existing = byCode.get(code)
      if (existing) existing.extra += 1
      else byCode.set(code, { code, label: p.productName, extra: 0 })
    }
    return Array.from(byCode.values())
  }, [data])

  // Upper-cased, because the backend matches `sos_item_code = $n` exactly — a
  // lower-case code returns zero rows with nothing to explain why. Orion item
  // codes are upper-case, so this is a normalisation, not a guess.
  //
  // This path carries more traffic than its name suggests: the product master
  // search covers cpm_product_code and cpm_product_name but NOT
  // cpm_erp_item_code, so typing an actual item code matches nothing in the
  // list below and lands here. It has to work.
  const typed = search.trim().toUpperCase()
  // Offer the typed code only when it is not already a listed option — no point
  // showing "use X" directly above X.
  const offerTyped =
    typed.length > 0 && !items.some((i) => i.code.toLowerCase() === typed.toLowerCase())

  const commit = (code: string) => {
    onChange(code)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full min-w-0 justify-between font-normal", className)}
        >
          {value ? (
            <span className="min-w-0 flex-1 truncate text-left font-mono text-xs">{value}</span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
              {placeholder}
            </span>
          )}
          {value ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear item filter"
              className="ml-2 shrink-0 rounded-sm opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange("")
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type an item code, or search a product…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!isLoading && !offerTyped && (
              <CommandEmpty>No product matches. Type an item code to filter on it.</CommandEmpty>
            )}
            {offerTyped && (
              <CommandGroup heading="Item code">
                <CommandItem value={`__typed__${typed}`} onSelect={() => commit(typed)}>
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="min-w-0 truncate">
                    Filter on <span className="font-mono">{typed}</span>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {items.length > 0 && (
              <CommandGroup heading="From product master">
                {items.map((i) => (
                  <CommandItem key={i.code} value={i.code} onSelect={() => commit(i.code)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", value === i.code ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-mono text-xs">{i.code}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {i.label}
                        {i.extra > 0 && ` +${i.extra} more product${i.extra > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
