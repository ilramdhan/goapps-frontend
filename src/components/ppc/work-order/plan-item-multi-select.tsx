"use client"

// PlanItemMultiSelect — picks the plan items a work order covers.
//
// The first pick is the anchor: the work order's product, machine group and
// route all come from it. Every later pick rides along as an additional plan
// item. Two ways in:
//
//   1. Suggested merges — the server's merge candidates for the anchor, grouped
//      by *why* they are compatible (same product + same shade, or same product
//      with both shades natural). Accepting one is always safe.
//   2. Manual multi-pick — any plan item at all. Allowed on purpose, but a pick
//      the server would refuse to merge is flagged inline before submit rather
//      than failing after a round trip.
//
// Ids are never shown: every row reads product code, shade, qty and deadline.

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { usePlanItems } from "@/hooks/ppc/use-plan-item"
import { useMergeCandidates } from "@/hooks/ppc/use-work-order"
import { PlanItemStatus } from "@/types/ppc/common"
import type { PlanItem } from "@/types/ppc/plan-item"
import { cn } from "@/lib/utils"

// Shade codes the backend treats as natural/undyed
// (services/ppc/internal/domain/workorder/merge.go — NaturalShades).
const NATURAL_SHADES = ["NL", "NATURAL", ""]

function normalizeShade(code: string | undefined): string {
  return (code ?? "").trim().toUpperCase()
}

function isNaturalShade(code: string | undefined): boolean {
  return NATURAL_SHADES.includes(normalizeShade(code))
}

/** shadeLabel renders a shade for humans, never blank. */
function shadeLabel(item: Pick<PlanItem, "shadeCode" | "shadeName">): string {
  return item.shadeName || item.shadeCode || "Natural"
}

/**
 * mergeReason names why a candidate may share the anchor's work order. The
 * backend predicate also requires the same machine group and a deadline inside
 * the window, but those are not a *reason* a planner recognises — product and
 * shade are.
 */
function mergeReason(anchor: PlanItem, candidate: PlanItem): string {
  const sameShade = normalizeShade(anchor.shadeCode) === normalizeShade(candidate.shadeCode)
  if (sameShade) return "Same product & shade"
  if (isNaturalShade(anchor.shadeCode) && isNaturalShade(candidate.shadeCode)) {
    return "Same product, both natural shade"
  }
  return "Same product"
}

interface PlanItemMultiSelectProps {
  value: PlanItem[]
  onChange: (items: PlanItem[]) => void
  disabled?: boolean
}

export function PlanItemMultiSelect({ value, onChange, disabled }: PlanItemMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const anchor = value[0]
  const extras = value.slice(1)

  const { data: listData, isLoading: listLoading } = usePlanItems({
    search,
    status: PlanItemStatus.PLAN_ITEM_STATUS_ACTIVE,
    pageSize: 50,
  })
  const options = useMemo(() => listData?.data ?? [], [listData])

  const { data: candidates = [], isLoading: candidatesLoading } = useMergeCandidates(
    anchor?.planItemId
  )
  const candidateIds = useMemo(
    () => new Set(candidates.map((c) => c.planItemId)),
    [candidates]
  )

  // Candidates the planner has not taken yet, bucketed by compatibility reason.
  const grouped = useMemo(() => {
    if (!anchor) return [] as Array<{ reason: string; items: PlanItem[] }>
    const chosen = new Set(value.map((p) => p.planItemId))
    const buckets = new Map<string, PlanItem[]>()
    for (const c of candidates) {
      if (chosen.has(c.planItemId)) continue
      const reason = mergeReason(anchor, c)
      const bucket = buckets.get(reason)
      if (bucket) bucket.push(c)
      else buckets.set(reason, [c])
    }
    return Array.from(buckets, ([reason, items]) => ({ reason, items }))
  }, [anchor, candidates, value])

  // Manual picks the server's merge predicate would reject. Only meaningful
  // once the candidate list has actually loaded — an empty list mid-flight
  // would otherwise flag every pick.
  const incompatible = useMemo(() => {
    if (!anchor || candidatesLoading) return [] as PlanItem[]
    return extras.filter((p) => !candidateIds.has(p.planItemId))
  }, [anchor, extras, candidateIds, candidatesLoading])

  const toggle = (item: PlanItem) => {
    const exists = value.some((p) => p.planItemId === item.planItemId)
    onChange(exists ? value.filter((p) => p.planItemId !== item.planItemId) : [...value, item])
  }

  const remove = (planItemId: number) => {
    onChange(value.filter((p) => p.planItemId !== planItemId))
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {value.length === 0 ? (
              <span className="text-muted-foreground">Select plan items…</span>
            ) : (
              <span className="truncate">
                {value.length === 1
                  ? `${anchor.productCode} — ${anchor.productName}`
                  : `${value.length} plan items selected`}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by product…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {listLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              <CommandEmpty>No plan item matches.</CommandEmpty>
              <CommandGroup>
                {options.map((p) => {
                  const picked = value.some((s) => s.planItemId === p.planItemId)
                  return (
                    <CommandItem
                      key={p.planItemId}
                      value={`${p.productCode} ${p.productName} ${p.shadeCode}`}
                      onSelect={() => toggle(p)}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", picked ? "opacity-100" : "opacity-0")}
                      />
                      <div className="flex min-w-0 flex-col">
                        <div className="truncate">
                          <span className="mr-2 font-mono text-xs text-muted-foreground">
                            {p.productCode}
                          </span>
                          <span>{p.productName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {shadeLabel(p)} · {p.qtyTarget} kg
                          {p.deadline ? ` · due ${p.deadline}` : ""}
                        </span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((p, i) => (
            <li
              key={p.planItemId}
              className="flex items-start gap-3 rounded-md border p-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium">
                    {p.productCode} — {p.productName}
                  </span>
                  {i === 0 ? (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Anchor
                    </Badge>
                  ) : (
                    !candidatesLoading &&
                    !candidateIds.has(p.planItemId) && (
                      <Badge variant="destructive" className="text-[10px] font-normal">
                        Not mergeable
                      </Badge>
                    )
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {shadeLabel(p)} · {p.qtyTarget} kg
                  {p.deadline ? ` · due ${p.deadline}` : ""}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                disabled={disabled}
                onClick={() => remove(p.planItemId)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Remove {p.productCode}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {incompatible.length > 0 && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-xs text-destructive">
          {incompatible.length === 1
            ? `${incompatible[0].productCode} does not match the anchor on product, machine group, shade or deadline window.`
            : `${incompatible.length} selected plan items do not match the anchor on product, machine group, shade or deadline window.`}{" "}
          The server rejects a work order that merges them — remove them or start
          from a different anchor.
        </p>
      )}

      {anchor && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">Suggested merges</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plan items the server will accept alongside{" "}
            <span className="font-medium">{anchor.productCode}</span>.
          </p>

          {candidatesLoading && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading candidates…
            </div>
          )}

          {!candidatesLoading && grouped.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              No further mergeable plan items for this anchor.
            </p>
          )}

          {!candidatesLoading &&
            grouped.map((group) => (
              <div key={group.reason} className="mt-3 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.reason}
                </p>
                {group.items.map((c) => (
                  <label
                    key={c.planItemId}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={false}
                      disabled={disabled}
                      onCheckedChange={() => toggle(c)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="truncate font-medium">
                        {c.productCode} — {c.productName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {shadeLabel(c)} · {c.qtyTarget} kg
                        {c.deadline ? ` · due ${c.deadline}` : ""}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
