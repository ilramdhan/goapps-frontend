"use client"

// RmCombobox — picks a raw-material line for a WO allocation.
//
// Scope note: an allocation's wire value is `crm_rm_id`, which identifies an RM
// *edge of the product's released route* (cost_route_rm), not an RM master row.
// The set of allocatable RMs is therefore exactly the set of route RM edges, so
// this combobox is fed from the route rather than from a global RM search.
// Options are already resolved to code + name by the backend; the numeric id is
// never rendered.

import { Check, ChevronsUpDown } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** One selectable RM edge, already resolved to human-readable labels. */
export interface RmOption {
  crmRmId: number
  rmCode: string
  rmName: string
  rmType: string
  routeStageName: string
  routeLevel: number
}

interface RmComboboxProps {
  value: number | undefined
  options: RmOption[]
  onChange: (option: RmOption) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /**
   * Labels for `value` when it is not present in `options` — e.g. a line saved
   * against a route edge that a later route revision removed. Without this the
   * trigger would read as empty, which looks like "no RM" on a line that has
   * one.
   */
  valueCode?: string
  valueName?: string
  /** Message shown when there are no options at all (product has no route). */
  emptyMessage?: string
}

export function RmCombobox({
  value,
  options,
  onChange,
  placeholder = "Select RM…",
  disabled,
  className,
  valueCode,
  valueName,
  emptyMessage = "No RM matches.",
}: RmComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selected = useMemo(() => {
    const found = options.find((o) => o.crmRmId === value)
    if (found) return { rmCode: found.rmCode, rmName: found.rmName, offRoute: false }
    if (value && (valueCode || valueName)) {
      return { rmCode: valueCode ?? "", rmName: valueName ?? "", offRoute: false }
    }
    // A saved line whose route edge is gone: say so instead of showing the id.
    if (value) return { rmCode: "", rmName: "Not in the current route", offRoute: true }
    return undefined
  }, [options, value, valueCode, valueName])

  // Case-insensitive filtering over code + name (Command's own filter is off so
  // the match rule stays explicit and matches the spec).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.rmCode.toLowerCase().includes(q) || o.rmName.toLowerCase().includes(q)
    )
  }, [options, search])

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
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                selected.offRoute && "text-muted-foreground italic"
              )}
            >
              {selected.rmCode && <span className="font-mono text-xs text-muted-foreground">{selected.rmCode}</span>}
              {selected.rmCode && selected.rmName ? " — " : ""}
              {selected.rmName}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by code or name…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{options.length === 0 ? emptyMessage : "No RM matches."}</CommandEmpty>
            <CommandGroup>
              {filtered.map((o) => (
                <CommandItem
                  key={o.crmRmId}
                  value={`${o.rmCode} ${o.rmName}`}
                  onSelect={() => {
                    onChange(o)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.crmRmId ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-col">
                    <div className="truncate">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{o.rmCode}</span>
                      <span>{o.rmName}</span>
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {[o.rmType, o.routeStageName && `Stage ${o.routeLevel} · ${o.routeStageName}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
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
