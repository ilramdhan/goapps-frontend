"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
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

// ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag, server-side search) —
// the client-side MAX_RENDERED_OPTIONS=200 cap + local `useMemo` filtering
// that used to live here is REMOVED: the backend now does the search
// (`ILIKE` on both code + label) and the row cap itself
// (`ListMasterOptions`, see lookup_master_repository.go — default LIMIT 200,
// max 500), so a second client-side cap would either be redundant or, if set
// lower than the server's, would re-introduce a *silent* truncation (cutting
// results the server already decided were relevant, with no banner). Instead
// we ask the server for one extra row (DISPLAY_LIMIT + 1) purely to detect
// "there are more matches than we're showing" without needing a separate
// COUNT(*) — if that extra row comes back, we still show only DISPLAY_LIMIT
// but keep the honest "refine your search" notice from before instead of
// silently dropping it.
const DISPLAY_LIMIT = 200

export function MasterLookupField({
  entry,
  draft,
  allEntries: _allEntries,
  onChangeLookup,
  disabled,
}: MasterLookupFieldProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  // ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag) — lazy fetch: only
  // query once this row's popover has actually been opened (was: eager fetch
  // on every ParamRow mount, i.e. for every lookup-typed parameter on the
  // page regardless of whether the user ever opens it).
  //
  // ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag, server-side search) —
  // `search` is now forwarded to the backend (debounced 300ms inside the
  // hook) instead of filtering a fully-fetched ~2700-row array client-side.
  // `limit: DISPLAY_LIMIT + 1` asks for one row past what we display so we
  // can still show an honest "there may be more — refine your search" notice
  // without a separate COUNT(*) round trip.
  const { data: options = [], isLoading: optionsLoading } = useMasterLookupOptions(
    entry.lookupMasterCode,
    open,
    search,
    DISPLAY_LIMIT + 1
  )

  const currentValue = draft.valueText

  const visibleOptions = useMemo(() => options.slice(0, DISPLAY_LIMIT), [options])
  const hasMore = options.length > DISPLAY_LIMIT

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

  // ⭐ BUG-2 fix (2026-08-27) — `selectedOption` only exists while `currentValue`
  // happens to be present in the CURRENTLY LOADED `options` page. That list is
  // now server-limited/searched (see DISPLAY_LIMIT notes above), so a value
  // saved earlier can legitimately fall outside it — narrower search text,
  // pagination, or the popover simply not having been reopened yet. When that
  // happens `selectedOption` is `undefined` and the previously-visible label
  // would vanish even though the stored value is unchanged.
  //
  // Fix: remember the last label we positively matched against a fetched
  // option, tagged with the value it belongs to. It's used as a fallback ONLY
  // while it still matches `currentValue` — if the value changes (a different
  // param, or a fresh selection), the stale label is discarded, never shown
  // against the wrong value. If we've never matched a label for this value
  // (e.g. the popover was never opened after load), there is nothing honest to
  // show, so we deliberately fall through to the placeholder — never the raw
  // stored value/code, which would look like a fabricated name.
  const [knownLabel, setKnownLabel] = useState<{ value: string; label: string } | null>(null)

  useEffect(() => {
    if (selectedOption) {
      setKnownLabel({ value: selectedOption.value, label: selectedOption.label })
    }
  }, [selectedOption])

  const fallbackLabel = knownLabel && knownLabel.value === currentValue ? knownLabel.label : undefined
  const displayValue = selectedOption?.label ?? fallbackLabel ?? ""

  return (
    <div className="space-y-1">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          // ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag) — clear the
          // local search text on close so reopening starts from the full
          // (capped) list rather than a stale filtered view.
          if (!next) setSearch("")
        }}
      >
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
          {/*
            ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag, server-side
            search) — `shouldFilter={false}` hands filtering off entirely:
            `search` is sent to the server (debounced, see
            useMasterLookupOptions) which does the ILIKE + LIMIT filtering in
            SQL, so cmdk never needs to score every mounted CommandItem's
            `keywords` on each keystroke.
          */}
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={`Search ${(entry.lookupMasterCode ?? "").toLowerCase()}…`}
            />
            <CommandList>
              {optionsLoading && (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              {!optionsLoading && options.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              <CommandGroup>
                {visibleOptions.map((opt, index) => {
                  // ⭐ DIPERBARUI 2026-08-26 (U-mbspin-lookup-detail): denier/filament/
                  // ldrPrsn/runLdrPct are only ever populated for the MB_SPIN lookup
                  // master — every other master's options leave all four undefined,
                  // so this row is skipped there.
                  const hasSpinDetails =
                    opt.denier !== undefined ||
                    opt.filament !== undefined ||
                    opt.ldrPrsn !== undefined ||
                    opt.runLdrPct !== undefined
                  // ⭐ DIPERBARUI 2026-08-26 (fix-mbspin-duplicate-key): `opt.value` (the
                  // master's "code" column, e.g. Oracle ORION item code for MB_SPIN) is
                  // NOT guaranteed unique — the same code can legitimately appear on
                  // multiple rows with different denier/filament/LDR (see SQL below).
                  // A duplicate `opt.value` used as both the React `key` and the cmdk
                  // CommandItem `value` caused two bugs at once: React's "two children
                  // with the same key" warning, and cmdk itself conflating the two items
                  // into one (so hovering either row highlighted both — cmdk tracks the
                  // hovered/selected item by `value`, not by list position).
                  // Fix: make the cmdk `value` (and React `key`) unique by appending the
                  // row's array index — index is stable for a given fetch and this list
                  // is never reordered client-side, so no key-recycling risk. The code
                  // actually persisted to the form on selection is still `opt.value`
                  // (via the onSelect closure below, which ignores the composite value
                  // cmdk hands back). `keywords` keeps search matching on the real code
                  // + label even though `value` now carries the disambiguating suffix.
                  // ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag): `index` here is
                  // the position within `visibleOptions` (the capped, currently-filtered
                  // slice), not the raw fetch array — still unique+stable per render, which
                  // is all React/cmdk key identity requires.
                  const itemKey = `${opt.value}__${index}`
                  return (
                    <CommandItem
                      key={itemKey}
                      value={itemKey}
                      keywords={[opt.value, opt.label]}
                      onSelect={() => handleSelect(opt.value)}
                      className="flex-col items-start gap-0.5 py-2"
                    >
                      <div className="flex w-full items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            currentValue === opt.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {hasSpinDetails && (
                        <div className="ml-6 flex w-full flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          {/* D13: a missing value stays "—", never a synthesized default. */}
                          <span className="truncate">Denier: {opt.denier ?? "—"}</span>
                          <span className="truncate">Filament: {opt.filament ?? "—"}</span>
                          {/*
                            ~~D30: previously showed a single "Dozing" value sourced from the
                            retired/contaminated mbs_dozing column (mixes oil-dozing-rate ~0.03
                            scale with run_ldr ~3.55 scale across MB Heads).~~
                            Dozing withdrawn by explicit user decision 2026-08-26 (D30
                            contamination) — replaced by the two unambiguous LDR columns below.
                          */}
                          <span className="truncate">LDR Rencana (%): {opt.ldrPrsn ?? "—"}</span>
                          <span className="truncate">LDR Aktual (%): {opt.runLdrPct ?? "—"}</span>
                        </div>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {/*
                ⭐ DIPERBARUI 2026-08-26 (perf: SP Code dropdown lag, server-side
                search) — search + LIMIT now run in `ListMasterOptions` on the
                server (see lookup_master_repository.go), so the client never
                sees the true total match count anymore and can't honestly
                report "N of M". Instead we over-fetch DISPLAY_LIMIT + 1 rows:
                if that extra row comes back, more matches exist than we show,
                so `hasMore` renders a notice that says so WITHOUT claiming a
                specific total — never a silent truncation.
              */}
              {!optionsLoading && hasMore && (
                <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                  Menampilkan {DISPLAY_LIMIT} hasil teratas
                  {search ? " yang cocok" : ""} — mungkin ada hasil lain, perhalus pencarian
                  untuk melihatnya.
                </div>
              )}
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
