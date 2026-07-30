"use client"

// PlanItemCombobox — picks a plan item by product + deadline, submits
// plan_item_id. Case-insensitive, label-based search. Never exposes the id.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { usePlanItems } from "@/hooks/ppc/use-plan-item"
import { cn } from "@/lib/utils"
import type { PlanItemStatus, PlanItemType } from "@/types/generated/ppc/v1/common"

interface PlanItemComboboxProps {
  value: number | undefined
  onChange: (planItemId: number, productCode: string, productName: string) => void
  month?: string
  demandId?: number
  status?: PlanItemStatus
  type?: PlanItemType
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PlanItemCombobox({
  value, onChange, month, demandId, status, type, placeholder = "Select plan item…", disabled, className,
}: PlanItemComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = usePlanItems({ search, month, demandId, status, type, pageSize: 50 })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => items.find((p) => p.planItemId === value), [items, value])

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
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by product…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>No plan item matches.</CommandEmpty>
            <CommandGroup>
              {items.map((p) => (
                <CommandItem
                  key={p.planItemId}
                  value={`${p.productCode} ${p.productName}`}
                  onSelect={() => {
                    onChange(p.planItemId, p.productCode, p.productName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.planItemId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{p.productCode}</span>
                      <span>{p.productName}</span>
                    </div>
                    {p.deadline && (
                      <span className="text-xs text-muted-foreground">Deadline {p.deadline}</span>
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
