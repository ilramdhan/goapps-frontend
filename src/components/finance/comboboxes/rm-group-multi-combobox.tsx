"use client"

// RmGroupMultiCombobox — multi-select RM Group filter (check items, count
// badge, clear), backed by RMGroupService.ListRMGroups (useRMGroups, the
// same hook RmGroupHeadCombobox uses). Search-as-you-type via the `search`
// param since the RM group master is not small enough to load in one page.
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
import { useRMGroups } from "@/hooks/finance/use-rm-group"
import { ActiveFilter } from "@/types/finance/rm-group"
import { cn } from "@/lib/utils"

interface RmGroupMultiComboboxProps {
  /** Selected RM group codes (group_code) — matches ListCostResultsRequest.rm_group_codes. */
  value: string[]
  onChange: (groupCodes: string[]) => void
  placeholder?: string
  className?: string
}

export function RmGroupMultiCombobox({
  value,
  onChange,
  placeholder = "All RM groups",
  className,
}: RmGroupMultiComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useRMGroups({
    search,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
    pageSize: 50,
  })
  const items = useMemo(() => data?.data ?? [], [data])

  const singleSelected = useMemo(
    () => (value.length === 1 ? items.find((g) => g.groupCode === value[0]) : undefined),
    [items, value],
  )

  function toggleGroup(groupCode: string) {
    onChange(value.includes(groupCode) ? value.filter((c) => c !== groupCode) : [...value, groupCode])
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
                  <span className="text-muted-foreground">{singleSelected.groupCode}</span> —{" "}
                  {singleSelected.groupName}
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
              <span className="truncate">RM groups</span>
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by group code or name…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No RM group matches.</CommandEmpty>
            <CommandGroup>
              {items.map((g) => (
                <CommandItem
                  key={g.groupHeadId}
                  value={`${g.groupCode} ${g.groupName}`}
                  onSelect={() => toggleGroup(g.groupCode)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(g.groupCode) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{g.groupCode}</span>
                  <span>{g.groupName}</span>
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
