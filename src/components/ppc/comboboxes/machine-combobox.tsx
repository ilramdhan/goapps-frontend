"use client"

// MachineCombobox — picks a PPC machine (sync-sourced from finance + Oracle).
// Shows machine_no + area + group, submits machine_id. Case-insensitive search.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMachines } from "@/hooks/ppc/use-machine"
import { AREA_LABELS } from "@/types/ppc/common"
import type { AreaCode } from "@/types/generated/ppc/v1/common"
import { cn } from "@/lib/utils"

interface MachineComboboxProps {
  value: number | undefined
  onChange: (machineId: number, machineNo: string) => void
  area?: AreaCode
  machineGroupId?: number
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MachineCombobox({
  value, onChange, area, machineGroupId, placeholder = "Select machine…", disabled, className,
}: MachineComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useMachines({
    search, area, machineGroupId, activeFilter: 1, pageSize: 50,
  })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => items.find((m) => m.machineId === value), [items, value])

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
          {selected ? (
            <span className="min-w-0 flex-1 truncate text-left">
              <span className="font-mono">{selected.machineNo}</span>
              <span className="ml-2 text-xs text-muted-foreground">{AREA_LABELS[selected.machineArea]}</span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by machine no…" value={search} onValueChange={setSearch} />
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
                  value={`${m.machineNo} ${m.machineGroupName}`}
                  onSelect={() => {
                    onChange(m.machineId, m.machineNo)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === m.machineId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2">{m.machineNo}</span>
                      <span className="text-xs text-muted-foreground">{AREA_LABELS[m.machineArea]}</span>
                    </div>
                    {m.machineGroupName && (
                      <span className="text-xs text-muted-foreground">{m.machineGroupName}</span>
                    )}
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
