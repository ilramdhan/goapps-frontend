"use client"

// RouteCombobox — picks the released route head for a product, submits
// crh_head_id (+ version). A product has at most one released route, so this is
// effectively a confirm-and-lock picker. Shows product code + route status +
// version label; never exposes the raw head id.
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useProductRoute } from "@/hooks/ppc/use-products-search"
import { cn } from "@/lib/utils"

interface RouteComboboxProps {
  productSysId: number | undefined
  value: number | undefined
  onChange: (headId: number, version: number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RouteCombobox({
  productSysId, value, onChange, placeholder = "Select route…", disabled, className,
}: RouteComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useProductRoute(productSysId)
  const routes = useMemo(() => (data ? [data] : []), [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return routes
    return routes.filter((r) => r.productCode.toLowerCase().includes(q))
  }, [routes, search])
  const selected = useMemo(() => routes.find((r) => r.headId === value), [routes, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !productSysId}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="truncate">
              <span className="text-muted-foreground">{selected.productCode}</span>
              <span className="ml-2 text-xs text-muted-foreground">v{selected.version} · {selected.routingStatus}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search route…" value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            <CommandEmpty>{productSysId ? "No released route." : "Select a product first."}</CommandEmpty>
            <CommandGroup>
              {filtered.map((r) => (
                <CommandItem
                  key={r.headId}
                  value={`${r.productCode} v${r.version}`}
                  onSelect={() => {
                    onChange(r.headId, r.version)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === r.headId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <div>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{r.productCode}</span>
                      <span>Version {r.version}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.routingStatus}</span>
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
