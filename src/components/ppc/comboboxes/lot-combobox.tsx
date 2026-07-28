"use client"

// LotCombobox — picks a lot master by lot_no (also the submitted value).
// Case-insensitive search over lot / item / shade. lot_no is a human code,
// not a surrogate id, so it is shown directly.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLotMasters } from "@/hooks/ppc/use-masters"
import { cn } from "@/lib/utils"

interface LotComboboxProps {
  value: string | undefined
  onChange: (lotNo: string, itemCode: string, shadeCode: string) => void
  itemCode?: string
  shadeCode?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function LotCombobox({
  value, onChange, itemCode, shadeCode, placeholder = "Select lot…", disabled, className,
}: LotComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useLotMasters({ search, itemCode, shadeCode, pageSize: 50 })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => items.find((l) => l.lotNo === value), [items, value])

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
            <span className="truncate font-mono">{selected.lotNo}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by lot / item / shade…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No lot matches.</CommandEmpty>
            <CommandGroup>
              {items.map((l) => (
                <CommandItem
                  key={l.lotNo}
                  value={`${l.lotNo} ${l.itemCode} ${l.shadeCode}`}
                  onSelect={() => {
                    onChange(l.lotNo, l.itemCode, l.shadeCode)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === l.lotNo ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{l.lotNo}</span>
                    {(l.itemCode || l.shadeCode) && (
                      <span className="text-xs text-muted-foreground">
                        {[l.itemCode, l.shadeCode].filter(Boolean).join(" · ")}
                      </span>
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
