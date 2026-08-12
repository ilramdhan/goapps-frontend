"use client"

// ProductTypeCombobox — picks a CostProductType by typeCode/typeName, never exposes typeId to the user.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
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
import { useCostProductTypes } from "@/hooks/finance/use-cost-product-type"
import { cn } from "@/lib/utils"

interface ProductTypeComboboxProps {
  value: number | undefined
  onChange: (typeId: number, typeCode: string, typeName: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Type codes to hide, e.g. ["MB"] where the caller cannot accept that type. Case-insensitive. */
  excludeTypeCodes?: string[]
}

export function ProductTypeCombobox({
  value,
  onChange,
  placeholder = "Select product type…",
  disabled,
  className,
  excludeTypeCodes,
}: ProductTypeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useCostProductTypes({ search, activeFilter: "active", pageSize: 50 })
  const excluded = useMemo(
    () => new Set((excludeTypeCodes ?? []).map((c) => c.toUpperCase())),
    [excludeTypeCodes]
  )
  const items = useMemo(
    () => (data?.items ?? []).filter((t) => !excluded.has(t.typeCode.toUpperCase())),
    [data, excluded]
  )
  const selected = useMemo(() => items.find((t) => t.typeId === value), [items, value])

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
              <span className="text-muted-foreground">{selected.typeCode}</span> — {selected.typeName}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search product types…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No product type matches.</CommandEmpty>
            <CommandGroup>
              {items.map((t) => (
                <CommandItem
                  key={t.typeId}
                  value={`${t.typeCode} ${t.typeName}`}
                  onSelect={() => {
                    onChange(t.typeId, t.typeCode, t.typeName)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === t.typeId ? "opacity-100" : "opacity-0")}
                  />
                  <span className="font-mono text-xs mr-2 text-muted-foreground">{t.typeCode}</span>
                  <span>{t.typeName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
