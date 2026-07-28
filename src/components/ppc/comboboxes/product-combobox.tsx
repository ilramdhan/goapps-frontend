"use client"

// ProductCombobox — picks a finance product projection (item / grade / shade)
// for PPC. Shows product code + name, submits cpm_product_sys_id. Server-side
// debounced search; never exposes the numeric sys id in the UI text.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useProductsSearch } from "@/hooks/ppc/use-products-search"
import { cn } from "@/lib/utils"

interface ProductComboboxProps {
  value: number | undefined
  onChange: (productSysId: number, productCode: string, productName: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /**
   * Label for `value` when the caller already knows it (e.g. an edit form
   * seeded from a record the backend decorated with product code/name).
   *
   * The search query only ever holds one page of products, so a value that is
   * not in that page has no label to render and the trigger would otherwise
   * read as empty — which looks like "no product" on a record that has one.
   */
  valueCode?: string
  valueName?: string
}

export function ProductCombobox({
  value, onChange, placeholder = "Select product…", disabled, className, valueCode, valueName,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useProductsSearch({ search, activeFilter: "active", pageSize: 50 })
  const items = useMemo(() => data ?? [], [data])
  const selected = useMemo(() => {
    const found = items.find((p) => p.productSysId === value)
    if (found) return found
    // Fall back to the caller-supplied label so a selected-but-unloaded
    // product still renders as itself, never as an empty field.
    if (value && (valueCode || valueName)) {
      return { productCode: valueCode ?? "", productName: valueName ?? "" }
    }
    return undefined
  }, [items, value, valueCode, valueName])

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
              <span className="text-muted-foreground">{selected.productCode}</span> — {selected.productName}
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
            <CommandEmpty>No product matches.</CommandEmpty>
            <CommandGroup>
              {items.map((p) => (
                <CommandItem
                  key={p.productSysId}
                  value={`${p.productCode} ${p.productName}`}
                  onSelect={() => {
                    onChange(p.productSysId, p.productCode, p.productName)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.productSysId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{p.productCode}</span>
                      <span>{p.productName}</span>
                    </div>
                    {(p.gradeCode || p.shadeName) && (
                      <span className="text-xs text-muted-foreground">
                        {[p.gradeCode, p.shadeName].filter(Boolean).join(" · ")}
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
