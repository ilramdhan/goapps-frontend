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
  /**
   * Label for `value` when the caller already knows it (e.g. an edit form
   * seeded from a demand the backend decorated with customer code/name).
   *
   * The search query only ever holds one page of customers, so a value outside
   * that page has no label and the trigger would read as empty — which looks
   * like "no customer" on a record that has one.
   */
  valueCode?: string
  valueName?: string
}

export function CustomerCombobox({
  value, onChange, placeholder = "Select customer…", disabled, className, valueCode, valueName,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useCustomers({ search, activeFilter: 1, pageSize: 50 })
  const items = useMemo(() => data?.data ?? [], [data])
  const selected = useMemo(() => {
    const found = items.find((c) => c.customerId === value)
    if (found) return found
    if (value && (valueCode || valueName)) {
      return { customerCode: valueCode ?? "", customerName: valueName ?? "" }
    }
    return undefined
  }, [items, value, valueCode, valueName])

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
              <span className="font-mono">{selected.customerCode}</span>
              {selected.customerName && (
                <span className="ml-2 text-xs text-muted-foreground">{selected.customerName}</span>
              )}
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
