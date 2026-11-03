"use client"

// Baris tab antar dashboard dalam satu grup nav_tab (mis. Packed Production, PP-09).

import Link from "next/link"

import { cn } from "@/lib/utils"
import { usePermission } from "@/lib/hooks/use-permission"
import { useAccessibleDashboards } from "@/hooks/bi"
import { resolveDashboardTabs } from "@/lib/bi/dashboard-tabs"

export function DashboardTabs({ code }: { code: string }) {
  const { hasPermission } = usePermission()
  const { data } = useAccessibleDashboards()

  const tabs = resolveDashboardTabs(code, data ?? [], hasPermission)
  if (tabs.length === 0) return null

  return (
    <nav aria-label="Dashboard tabs" className="flex flex-wrap gap-1 border-b">
      {tabs.map((t) => (
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
