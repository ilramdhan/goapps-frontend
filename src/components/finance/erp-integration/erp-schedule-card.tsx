"use client"

import Link from "next/link"
import { CalendarClock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useErpSchedule } from "@/hooks/finance/use-erp-integration"

export function ErpScheduleCard() {
  const { data: s } = useErpSchedule()
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" /> Schedule
        </CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link href="/finance/erp-integration/schedule">Manage schedule</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {s ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            <dt className="text-muted-foreground">Enabled</dt>
            <dd>
              <Badge variant={s.enabled ? "default" : "outline"}>{s.enabled ? "ON" : "OFF"}</Badge>
            </dd>
            <dt className="text-muted-foreground">Source</dt>
            <dd>{s.source || "—"}</dd>
            <dt className="text-muted-foreground">Cron</dt>
            <dd className="font-mono text-xs">{s.cron || "—"}</dd>
            <dt className="text-muted-foreground">Day / time</dt>
            <dd>
              {s.runDayOfMonth || "—"} / {s.runTime || "—"}
            </dd>
            <dt className="text-muted-foreground">Next run</dt>
            <dd>{s.nextRunAt || "—"}</dd>
          </dl>
        ) : (
          <p className="text-muted-foreground">Loading…</p>
        )}
        {s && s.validationErrors.length > 0 && (
          <ul className="list-disc pl-4 text-xs text-destructive">
            {s.validationErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Scheduled runs only do Load demand → Validate. Push and valuation always need a person with typed
          confirmation.
        </p>
      </CardContent>
    </Card>
  )
}
