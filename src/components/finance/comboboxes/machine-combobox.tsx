"use client"

// MachineCombobox — picks a Machine (mst_machine) by machine_code/machine_name, scoped to mc_type.
// Used by MB Head form to assign the machine that resolves MACHINE_MB_FIXED_TOTAL.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMachines } from "@/hooks/finance/use-machine"
import { ActiveFilter } from "@/types/finance/machine"
import { cn } from "@/lib/utils"

interface MachineComboboxProps {
  value: string | undefined
  onChange: (machineId: string, machineCode: string, machineName: string) => void
  mcTypeFilter?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MachineCombobox({
  value, onChange, mcTypeFilter = "MB", placeholder = "Select machine…", disabled, className,
}: MachineComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useMachines({
    search, mcTypeFilter, activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE, pageSize: 50,
  })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => items.find((m) => m.machineId === value), [items, value])

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
              <span className="text-muted-foreground">{selected.machineCode}</span> — {selected.machineName}
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
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No machine matches.</CommandEmpty>
            <CommandGroup>
              {items.map((m) => (
                <CommandItem
                  key={m.machineId}
                  value={`${m.machineCode} ${m.machineName}`}
                  onSelect={() => {
                    onChange(m.machineId, m.machineCode, m.machineName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === m.machineId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{m.machineCode}</span>
                      <span>{m.machineName}</span>
                    </div>
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
