"use client"

// RmGroupHeadCombobox — picks an RM Group (mst_rm_group_head) by group_code/group_name.
// Used by MB Recipe composition rows when source_type = GROUP.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRMGroups } from "@/hooks/finance/use-rm-group"
import { ActiveFilter } from "@/types/generated/finance/v1/uom"
import { cn } from "@/lib/utils"

interface RmGroupHeadComboboxProps {
  value: string | undefined
  onChange: (groupHeadId: string, groupCode: string, groupName: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RmGroupHeadCombobox({
  value, onChange, placeholder = "Select RM group…", disabled, className,
}: RmGroupHeadComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useRMGroups({ search, activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE, pageSize: 50 })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => items.find((g) => g.groupHeadId === value), [items, value])

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
              <span className="text-muted-foreground">{selected.groupCode}</span> — {selected.groupName}
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
            <CommandEmpty>No RM group matches.</CommandEmpty>
            <CommandGroup>
              {items.map((g) => (
                <CommandItem
                  key={g.groupHeadId}
                  value={`${g.groupCode} ${g.groupName}`}
                  onSelect={() => {
                    onChange(g.groupHeadId, g.groupCode, g.groupName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === g.groupHeadId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{g.groupCode}</span>
                      <span>{g.groupName}</span>
                    </div>
                    {(g.colourant || g.ciName) && (
                      <div className="text-xs text-muted-foreground">
                        {[g.colourant, g.ciName].filter(Boolean).join(" · ")}
                      </div>
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
