"use client"

// MbHeadRefCombobox — picks another MB Head (mst_mb_head) by dev_code/shade_code/shade_name.
// Used by MB Recipe composition rows when source_type = MB (a carrier/base MB reference).
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMBHeads } from "@/hooks/finance/use-mb-head"
import { cn } from "@/lib/utils"

interface MbHeadRefComboboxProps {
  value: string | undefined
  onChange: (mbhId: string, devCode: string, shadeName: string) => void
  excludeMbhId?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Builds the display label for one MB head option: the MB's own name always comes
// first, with shade code/name appended after a dash when present. Falls back to the
// dev code / batch cost code / ID so the item is never rendered with no text at all
// (some MBs have neither shade code nor shade name).
function formatMbHeadRefLabel(h: {
  mbhMgtName: string
  devCode: string
  mbhMbCosting: string
  mbhId: string
  shadeCode: string
  shadeName: string
}): string {
  const name = h.mbhMgtName || h.devCode || h.mbhMbCosting || h.mbhId
  const shadePart = [h.shadeCode, h.shadeName].filter(Boolean).join(" / ")
  return shadePart ? `${name} - ${shadePart}` : name
}

export function MbHeadRefCombobox({
  value, onChange, excludeMbhId, placeholder = "Select MB head…", disabled, className,
}: MbHeadRefComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useMBHeads({ search, pageSize: 50 })
  const filtered = useMemo(
    () => (data?.data ?? []).filter((h) => h.mbhId !== excludeMbhId),
    [data, excludeMbhId],
  )
  const selected = useMemo(() => filtered.find((h) => h.mbhId === value), [filtered, value])

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
            <span className="truncate">{formatMbHeadRefLabel(selected)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by dev code or shade…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No MB head matches.</CommandEmpty>
            <CommandGroup>
              {filtered.map((h) => (
                <CommandItem
                  key={h.mbhId}
                  value={`${h.mbhMgtName} ${h.devCode} ${h.shadeCode} ${h.shadeName}`}
                  onSelect={() => {
                    onChange(h.mbhId, h.devCode, h.shadeName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === h.mbhId ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{formatMbHeadRefLabel(h)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
