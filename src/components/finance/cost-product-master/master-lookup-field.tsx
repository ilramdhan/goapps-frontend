"use client"

import { useState, useCallback } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
import { useMasterLookupOptions } from "@/hooks/finance/use-master-lookup"
import type { LookupFillValuesResponse } from "@/types/finance/yarn-master"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"
import type { DraftValue } from "./parameters-tab"

interface MasterLookupFieldProps {
  entry: RequiredParamEntry
  draft: DraftValue
  // allEntries is passed for context but auto-population happens in the parent via onChangeLookup.
  allEntries: RequiredParamEntry[]
  onChangeLookup: (
    triggerParamId: string,
    selectedKey: string,
    fills: LookupFillValuesResponse | null
  ) => void
  disabled?: boolean
}

export function MasterLookupField({
  entry,
  draft,
  allEntries: _allEntries,
  onChangeLookup,
  disabled,
}: MasterLookupFieldProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { data: options = [], isLoading: optionsLoading } = useMasterLookupOptions(
    entry.lookupMasterCode
  )

  const currentValue = draft.valueText

  const handleSelect = useCallback(
    async (selectedKey: string) => {
      setOpen(false)
      if (selectedKey === currentValue) return

      setLoading(true)
      try {
        const params = new URLSearchParams({
          lookupMasterCode: entry.lookupMasterCode ?? "",
          selectedKey,
          sourceParamCode: entry.paramCode,
        })
        const res = await fetch(`/api/v1/finance/lookup-fill-values?${params.toString()}`)
        if (res.ok) {
          const json = (await res.json()) as { data?: LookupFillValuesResponse }
          onChangeLookup(entry.paramId, selectedKey, json.data ?? null)
        } else {
          toast.error("Failed to load auto-fill values. Check master data exists.")
          onChangeLookup(entry.paramId, selectedKey, null)
        }
      } catch {
        toast.error("Failed to load auto-fill values.")
        onChangeLookup(entry.paramId, selectedKey, null)
      } finally {
        setLoading(false)
      }
    },
    [entry.paramId, entry.paramCode, entry.lookupMasterCode, currentValue, onChangeLookup]
  )

  const selectedOption = options.find((o) => o.value === currentValue)
  const displayValue = selectedOption?.label ?? currentValue ?? ""

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-9 px-3"
            disabled={loading || disabled}
          >
            {loading ? (
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Auto-filling…
              </span>
            ) : (
              <span
                className={cn("truncate text-sm", !currentValue && "text-muted-foreground")}
              >
                {displayValue || `Select ${entry.lookupMasterCode ?? ""}…`}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={`Search ${(entry.lookupMasterCode ?? "").toLowerCase()}…`}
            />
            <CommandList>
              {optionsLoading && (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              {!optionsLoading && <CommandEmpty>No results found.</CommandEmpty>}
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt.value} value={opt.value} onSelect={handleSelect}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentValue === opt.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {currentValue && (
        <p className="text-[10px] text-muted-foreground">
          Auto-fills related params on selection change.
        </p>
      )}
    </div>
  )
}
