"use client"

// DemandCombobox — picks a demand by product + contract, submits demand_id.
// Case-insensitive, label-based search. Never exposes demand_id in the UI.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDemands } from "@/hooks/ppc/use-demand"
import { cn } from "@/lib/utils"
import { DemandStatus as DemandStatusEnum, type DemandStatus } from "@/types/generated/ppc/v1/common"

interface DemandComboboxProps {
  value: number | undefined
  onChange: (demandId: number, productCode: string, contractNo: string) => void
  month?: string
  status?: DemandStatus
  /**
   * Hides demands that already have a plan item. Server-side filter: a
   * client-side pass over the loaded page would let already-planned demands
   * back in from later pages.
   */
  withoutPlan?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DemandCombobox({
  value, onChange, month, status, withoutPlan, placeholder = "Select demand…", disabled, className,
}: DemandComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useDemands({ search, month, status, withoutPlan, pageSize: 50 })
  // A demand with no product linked yet cannot be planned, so it must not be
  // offered here — picking one would only fail server-side.
  const items = useMemo(
    () =>
      (data?.data ?? []).filter(
        (d) => d.status !== DemandStatusEnum.DEMAND_STATUS_PENDING_PRODUCT_LINK
      ),
    [data]
  )
  const selected = useMemo(() => items.find((d) => d.demandId === value), [items, value])

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
              <span className="text-muted-foreground">{selected.productCode}</span> — {selected.productName}
              {selected.contractNo && <span className="ml-2 text-xs text-muted-foreground">[{selected.contractNo}]</span>}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by product or contract…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No demand matches.</CommandEmpty>
            <CommandGroup>
              {items.map((d) => (
                <CommandItem
                  key={d.demandId}
                  value={`${d.productCode} ${d.productName} ${d.contractNo}`}
                  onSelect={() => {
                    onChange(d.demandId, d.productCode, d.contractNo)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === d.demandId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{d.productCode}</span>
                      <span>{d.productName}</span>
                    </div>
                    {d.contractNo && (
                      <span className="text-xs text-muted-foreground">Contract {d.contractNo}</span>
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
