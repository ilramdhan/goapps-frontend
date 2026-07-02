"use client"

// ProductTypeMultiCombobox — multi-select CostProductType filter (check items, count badge, clear).
// Follows the ProductTypeCombobox Popover+Command conventions; the popover stays open while toggling.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
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
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCostProductTypes } from "@/hooks/finance/use-cost-product-type"
import { cn } from "@/lib/utils"

interface ProductTypeMultiComboboxProps {
  value: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  className?: string
}

export function ProductTypeMultiCombobox({
  value,
  onChange,
  placeholder = "All product types",
  className,
}: ProductTypeMultiComboboxProps) {
  const [open, setOpen] = useState(false)
  // Single stable query (no server search) so selected labels always resolve;
  // the type master is small, so Command's built-in client-side filtering suffices.
  const { data, isLoading } = useCostProductTypes({ activeFilter: "active", pageSize: 50 })
  const items = useMemo(() => data?.items ?? [], [data])

  const singleSelected = useMemo(
    () => (value.length === 1 ? items.find((t) => t.typeId === value[0]) : undefined),
    [items, value],
  )

  function toggleType(typeId: number) {
    onChange(value.includes(typeId) ? value.filter((id) => id !== typeId) : [...value, typeId])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between font-normal", className)}
        >
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : value.length === 1 ? (
            <span className="truncate">
              {singleSelected ? (
                <>
                  <span className="text-muted-foreground">{singleSelected.typeCode}</span> —{" "}
                  {singleSelected.typeName}
                </>
              ) : (
                "1 type"
              )}
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <Badge variant="secondary" className="rounded-sm px-1.5 font-normal">
                {value.length}
              </Badge>
              <span className="truncate">types</span>
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search product types…" />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No product type matches.</CommandEmpty>
            <CommandGroup>
              {items.map((t) => (
                <CommandItem
                  key={t.typeId}
                  value={`${t.typeCode} ${t.typeName}`}
                  onSelect={() => toggleType(t.typeId)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(t.typeId) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{t.typeCode}</span>
                  <span>{t.typeName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {value.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    className="justify-center text-center text-sm"
                    onSelect={() => onChange([])}
                  >
                    Clear selection
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
