"use client"

// MBFinalProductCombobox (B12) — CREATABLE picker for `mbh_final_product`.
//
// The column is and stays FREE TEXT: the combobox only offers existing product
// names as a convenience. Whatever the user types is accepted verbatim via the
// "Use …" row, so no value that the legacy form could store becomes unreachable.

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCostProductMasters } from "@/hooks/finance/use-cost-product-master"
import { cn } from "@/lib/utils"

interface MBFinalProductComboboxProps {
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function MBFinalProductCombobox({
  value,
  onChange,
  placeholder = "Select or type a final product…",
  disabled,
  id,
}: MBFinalProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useCostProductMasters({ search, activeFilter: "active", pageSize: 50 })
  const items = data?.items ?? []

  const trimmed = search.trim()
  const isNewValue = trimmed !== "" && !items.some((p) => p.productName === trimmed)

  function commit(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Final Product"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or type a new value…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!isLoading && items.length === 0 && !isNewValue && <CommandEmpty>No product matches.</CommandEmpty>}
            {isNewValue && (
              <CommandGroup>
                {/* Free-text escape hatch — this is what makes the combobox "creatable". */}
                <CommandItem value={`__create__${trimmed}`} onSelect={() => commit(trimmed)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Use &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {items.map((p) => (
                <CommandItem
                  key={p.productSysId}
                  value={`${p.productCode} ${p.productName}`}
                  onSelect={() => commit(p.productName)}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.productName ? "opacity-100" : "opacity-0")} />
                  <div>
                    <span className="text-muted-foreground mr-2 font-mono text-xs">{p.productCode}</span>
                    <span>{p.productName}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
