"use client"

// ParameterCombobox — picks an mst_parameter definition (finance projection),
// submits param_id but only ever shows param_code + param_name. Case-insensitive
// label search. Never exposes the raw UUID. Optional displayGroup scopes to a
// parameter set (e.g. "Machine" for the WO machine-parameter forms).
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useParametersSearch } from "@/hooks/ppc/use-parameters-search"
import { cn } from "@/lib/utils"

interface ParameterComboboxProps {
  value: string | undefined // param_id (UUID) — stored, never displayed
  onChange: (paramId: string, paramCode: string, dataType: string) => void
  displayGroup?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ParameterCombobox({
  value, onChange, displayGroup, placeholder = "Select parameter…", disabled, className,
}: ParameterComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useParametersSearch({ search, displayGroup, pageSize: 100 })
  const items = useMemo(() => data ?? [], [data])
  const selected = useMemo(() => items.find((p) => p.paramId === value), [items, value])

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
              <span className="font-medium">{selected.paramCode}</span>
              <span className="ml-2 text-xs text-muted-foreground">{selected.paramName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by code or name…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No parameter matches.</CommandEmpty>
            <CommandGroup>
              {items.map((p) => (
                <CommandItem
                  key={p.paramId}
                  value={`${p.paramCode} ${p.paramName}`}
                  onSelect={() => {
                    onChange(p.paramId, p.paramCode, p.dataType)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.paramId ? "opacity-100" : "opacity-0")} />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{p.paramCode}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.paramName}
                      {p.displayGroup ? ` · ${p.displayGroup}` : ""}
                      {p.dataType ? ` · ${p.dataType}` : ""}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
