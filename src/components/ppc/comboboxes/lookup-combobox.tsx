"use client"

// LookupCombobox — generic picker over one PPC lookup category (PPC_AREA,
// DEMAND_TYPE, GRADE_REQ, …). Shows the human label, submits the lookup `code`.
// Case-insensitive, label-based search. Never exposes lookup_id.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { usePpcLookups, type PpcLookupCategory } from "@/hooks/ppc/use-lookups"
import { cn } from "@/lib/utils"

interface LookupComboboxProps {
  category: PpcLookupCategory | string
  value: string | undefined
  onChange: (code: string, label: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function LookupCombobox({
  category, value, onChange, placeholder = "Select…", disabled, className,
}: LookupComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = usePpcLookups(category)
  const items = useMemo(() => data ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((l) => l.label.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
  }, [items, search])
  const selected = useMemo(() => items.find((l) => l.code === value), [items, value])

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
            <span className="truncate">{selected.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No option matches.</CommandEmpty>
            <CommandGroup>
              {filtered.map((l) => (
                <CommandItem
                  key={l.code}
                  value={`${l.label} ${l.code}`}
                  onSelect={() => {
                    onChange(l.code, l.label)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === l.code ? "opacity-100" : "opacity-0")} />
                  <span>{l.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
