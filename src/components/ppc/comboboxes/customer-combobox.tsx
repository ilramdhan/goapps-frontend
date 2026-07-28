"use client"

// CustomerCombobox — picks a PPC customer (sync-sourced from Orion OM_CUSTOMER).
// Shows customer code + name, submits customer_id. Case-insensitive search.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCustomers } from "@/hooks/ppc/use-customer"
import { cn } from "@/lib/utils"

interface CustomerComboboxProps {
  value: number | undefined
  onChange: (customerId: number, customerCode: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CustomerCombobox({
  value, onChange, placeholder = "Select customer…", disabled, className,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useCustomers({ search, activeFilter: 1, pageSize: 50 })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => items.find((c) => c.customerId === value), [items, value])

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
              <span className="font-mono">{selected.customerCode}</span>
              <span className="ml-2 text-xs text-muted-foreground">{selected.customerName}</span>
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
            <CommandEmpty>No customer matches.</CommandEmpty>
            <CommandGroup>
              {items.map((c) => (
                <CommandItem
                  key={c.customerId}
                  value={`${c.customerCode} ${c.customerName}`}
                  onSelect={() => {
                    onChange(c.customerId, c.customerCode)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === c.customerId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{c.customerCode}</span>
                    <span className="text-xs text-muted-foreground">{c.customerName}</span>
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
