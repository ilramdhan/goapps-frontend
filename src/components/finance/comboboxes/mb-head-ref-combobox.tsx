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
            <span className="truncate">
              <span className="text-muted-foreground">{selected.devCode}</span> — {selected.shadeName || selected.shadeCode}
            </span>
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
                  value={`${h.devCode} ${h.shadeCode} ${h.shadeName}`}
                  onSelect={() => {
                    onChange(h.mbhId, h.devCode, h.shadeName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === h.mbhId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{h.devCode}</span>
                      <span>{h.shadeName || h.shadeCode}</span>
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
