"use client"

// ProductTypeMultiSelect — picks the product types that share one TX weight config.
// A product type belongs to at most one config: types owned by another config are
// listed but disabled, labelled with that config's code.

import { useState } from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { TxWeightProductTypeRef } from "@/types/finance/yarn-tx-weight"

interface ProductTypeMultiSelectProps {
  options: TxWeightProductTypeRef[]
  value: number[]
  onChange: (ids: number[]) => void
  /** product type id → code of the other config that already owns it */
  owners: Map<number, string>
  disabled?: boolean
  loading?: boolean
}

export function ProductTypeMultiSelect({
  options,
  value,
  onChange,
  owners,
  disabled,
  loading,
}: ProductTypeMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = new Set(value)
  const byId = new Map(options.map((o) => [o.id, o]))

  const toggle = (id: number) => {
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div className="space-y-2">
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full min-w-0 justify-between font-normal"
          >
            <span className={cn("min-w-0 flex-1 truncate text-left", value.length === 0 && "text-muted-foreground")}>
              {value.length === 0
                ? loading
                  ? "Loading…"
                  : "Select product types…"
                : `${value.length} product type${value.length > 1 ? "s" : ""} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search product type…" />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              <CommandEmpty>No product type matches.</CommandEmpty>
              <CommandGroup>
                {options.map((pt) => {
                  const picked = selected.has(pt.id)
                  const owner = owners.get(pt.id)
                  return (
                    <CommandItem
                      key={pt.id}
                      value={`${pt.code} ${pt.name}`}
                      disabled={!!owner && !picked}
                      onSelect={() => toggle(pt.id)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", picked ? "opacity-100" : "opacity-0")} />
                      <span className="mr-2 font-mono text-xs">{pt.code}</span>
                      <span className="min-w-0 flex-1 truncate">{pt.name}</span>
                      {owner && !picked && (
                        <Badge variant="outline" className="ml-2 shrink-0 text-[10px] font-normal">
                          in {owner}
                        </Badge>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((id) => {
            const pt = byId.get(id)
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1 font-mono text-xs font-normal">
                {pt?.code ?? `#${id}`}
                <button
                  type="button"
                  className="rounded-sm opacity-70 hover:opacity-100 disabled:pointer-events-none"
                  disabled={disabled}
                  onClick={() => toggle(id)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {pt?.code ?? id}</span>
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
