"use client"

// MachineGroupCombobox — picks a machine group by name, submits group_id.
// Case-insensitive, label-based search. Never exposes group_id in the UI.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMachineGroups } from "@/hooks/ppc/use-masters"
import { AREA_LABELS } from "@/types/ppc/common"
import type { AreaCode } from "@/types/generated/ppc/v1/common"
import { cn } from "@/lib/utils"

interface MachineGroupComboboxProps {
  value: number | undefined
  onChange: (groupId: number, groupName: string) => void
  area?: AreaCode
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MachineGroupCombobox({
  value, onChange, area, placeholder = "Select machine group…", disabled, className,
}: MachineGroupComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useMachineGroups({ search, area, pageSize: 100 })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => items.find((g) => g.groupId === value), [items, value])

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
            <span className="truncate">{selected.groupName}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by group name…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No machine group matches.</CommandEmpty>
            <CommandGroup>
              {items.map((g) => (
                <CommandItem
                  key={g.groupId}
                  value={g.groupName}
                  onSelect={() => {
                    onChange(g.groupId, g.groupName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === g.groupId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{g.groupName}</span>
                    <span className="text-xs text-muted-foreground">{AREA_LABELS[g.groupArea]}</span>
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
