"use client"

// ShadeCombobox — R10 (2026-08-26): picks one Shade from the master
// (cost_erp_shade, via ShadeService.ListShades) instead of the user typing a
// free-text "Shade Code" and "Shade Name" into two separate inputs.
//
// Modeled directly on MbHeadRefCombobox (../comboboxes/mb-head-ref-combobox.tsx)
// — same debounced-search-over-Popover/Command shape, same "code — name" row.
//
// Why server-side search, not a big pageSize: master shade has 2320 rows.
// MbHeadRefCombobox's pageSize:50 pattern works there because MB heads are a
// much smaller table; shade is not, so this component always searches via the
// `search` query param and never tries to load the full list client-side.
//
// Legacy-data handling (R10 decision, not a guess — see report): unlike
// MbHeadRefCombobox, this combobox does NOT key its "selected" state off a
// master row id. MB Recipe rows only ever stored the shade CODE + NAME as
// free text, and 2320 shade codes are effectively an open set relative to
// years of historical recipe data — a recipe's stored code may not exist in
// cost_erp_shade today (renamed, retired, typo, pre-dates the master). If the
// trigger only rendered when a master match was found, opening an old recipe
// would appear to have "lost" its shade. So the trigger always renders
// whatever the form currently holds (`code` / `name` props), independent of
// whether that pair matches any row returned by the search. Selecting a row
// from the list always overwrites both via onSelect — nothing here can make
// an already-saved value blank or unsavable.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useShades } from "@/hooks/finance/use-shade"
import { ActiveFilter } from "@/types/finance/shade"
import { cn } from "@/lib/utils"

interface ShadeComboboxProps {
  /** Current shade code held by the form (may not exist in master — see file header). */
  code: string | undefined
  /** Current shade name held by the form. */
  name: string | undefined
  /** Fired when the user picks a row from the master list. Sets both code and name. */
  onSelect: (shadeCode: string, shadeName: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ShadeCombobox({ code, name, onSelect, placeholder = "Select shade…", disabled, className }: ShadeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  // page/pageSize sent explicitly — proto validation requires page >= 1, pageSize >= 1.
  // activeFilter restricts the pick list to active shades only (a new pick must
  // always be a currently-usable master row); this does not affect the
  // already-selected code/name shown on the trigger for legacy data — see the
  // file header.
  const { data, isLoading } = useShades({ page: 1, pageSize: 20, search, activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE })
  const shades = data?.data ?? []

  const hasValue = Boolean(code || name)

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
          {hasValue ? (
            <span className="truncate">
              <span className="text-muted-foreground font-mono text-xs">{code || "—"}</span>
              {name ? <> — {name}</> : null}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by shade code or name…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No shade matches.</CommandEmpty>
            <CommandGroup>
              {shades.map((s) => (
                <CommandItem
                  key={s.shadeId}
                  value={`${s.shadeCode} ${s.shadeName}`}
                  onSelect={() => {
                    onSelect(s.shadeCode, s.shadeName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", code === s.shadeCode ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{s.shadeCode}</span>
                      <span>{s.shadeName}</span>
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
