"use client"

// ShadeMultiCombobox — multi-select Shade filter (check items, count badge, clear).
// Follows ProductTypeMultiCombobox's Popover+Command conventions, but the
// shade master is large (2320 rows — see ShadeCombobox's file header), so
// this reuses the same server-side-search data source (useShades) as the
// existing single-select ShadeCombobox instead of loading the full list.
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
import { useShades } from "@/hooks/finance/use-shade"
import { ActiveFilter } from "@/types/finance/shade"
import { cn } from "@/lib/utils"

interface ShadeMultiComboboxProps {
  value: string[]
  onChange: (shadeCodes: string[]) => void
  placeholder?: string
  className?: string
}

export function ShadeMultiCombobox({
  value,
  onChange,
  placeholder = "All shades",
  className,
}: ShadeMultiComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  // Server-side search (same as ShadeCombobox) — the shade master is too
  // large for a single client-filtered page like ProductTypeMultiCombobox
  // uses for product types.
  const { data, isLoading } = useShades({
    page: 1,
    pageSize: 20,
    search,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
  })
  const shades = useMemo(() => data?.data ?? [], [data])

  const singleSelected = useMemo(
    () => (value.length === 1 ? shades.find((s) => s.shadeCode === value[0]) : undefined),
    [shades, value],
  )

  function toggleShade(shadeCode: string) {
    onChange(value.includes(shadeCode) ? value.filter((c) => c !== shadeCode) : [...value, shadeCode])
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
                  <span className="text-muted-foreground">{singleSelected.shadeCode}</span> —{" "}
                  {singleSelected.shadeName}
                </>
              ) : (
                value[0]
              )}
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <Badge variant="secondary" className="rounded-sm px-1.5 font-normal">
                {value.length}
              </Badge>
              <span className="truncate">shades</span>
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by shade code or name…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No shade matches.</CommandEmpty>
            <CommandGroup>
              {shades.map((s) => (
                <CommandItem
                  key={s.shadeId}
                  value={`${s.shadeCode} ${s.shadeName}`}
                  onSelect={() => toggleShade(s.shadeCode)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(s.shadeCode) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{s.shadeCode}</span>
                  <span>{s.shadeName}</span>
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
