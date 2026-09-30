"use client"

// Small provenance badge for RM Group period-overlaid values (backlog1 T19).
// Renders nothing when the values are the period's own exact row.

import { History } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { inheritedFromPeriodLabel } from "@/types/finance/rm-group"

interface InheritedPeriodBadgeProps {
  inheritedFromPeriod?: string | null
  className?: string
}

export function InheritedPeriodBadge({ inheritedFromPeriod, className }: InheritedPeriodBadgeProps) {
  const label = inheritedFromPeriodLabel(inheritedFromPeriod)
  if (!label) return null
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-normal border-amber-500/60 text-amber-700 dark:text-amber-400 whitespace-nowrap",
        className,
      )}
      title="Belum ada nilai tersimpan untuk periode ini — nilai ini diwarisi. Simpan untuk membuat nilai periode ini."
      data-testid="inherited-period-badge"
    >
      <History className="h-3 w-3" />
      {label}
    </Badge>
  )
}
