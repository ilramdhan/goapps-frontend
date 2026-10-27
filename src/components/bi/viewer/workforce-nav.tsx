"use client"

// Workforce dashboards share one sidebar menu (H034); this row links between them.
// Tabs come from each dashboard's layout_config.nav_tab {label, permission} (H065).

import Link from "next/link"

import { cn } from "@/lib/utils"
import { usePermission } from "@/lib/hooks/use-permission"
import { useAccessibleDashboards } from "@/hooks/bi"

interface NavTab {
  code: string
  label: string
  permission: string
  order: number
}

export function WorkforceNav({ code }: { code: string }) {
  const { hasPermission } = usePermission()
  const { data } = useAccessibleDashboards()

  const tabs: NavTab[] = (data ?? [])
    .flatMap((d) => {
      const nav = (d.layoutConfig as Record<string, unknown> | undefined)?.nav_tab as
        | { label?: string; permission?: string }
        | undefined
      if (!nav?.label || !nav.permission) return []
      return [{ code: d.dashboardCode, label: nav.label, permission: nav.permission, order: d.displayOrder }]
    })
    .sort((a, b) => a.order - b.order)
    .filter((t) => hasPermission(t.permission))

  // Only dashboards that carry a nav_tab show the row; single tab = nothing to switch to.
  if (tabs.length < 2 || !tabs.some((t) => t.code === code)) return null

  return (
    <nav aria-label="Workforce" className="flex flex-wrap gap-1 border-b">
      {tabs.map(t => (
        <Link
          key={t.code}
          href={`/finance/bi/${t.code}`}
          aria-current={t.code === code ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            t.code === code
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
