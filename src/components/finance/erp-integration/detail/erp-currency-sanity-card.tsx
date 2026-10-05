"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useErpCurrencySanity } from "@/hooks/finance/use-erp-integration"

export function ErpCurrencySanityCard({ period }: { period: string }) {
  const { data } = useErpCurrencySanity(period)
  const rows = data?.items ?? []
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-medium">Currency sanity ({period})</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No rates.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {rows.map((r) => (
            <li key={r.currency} className="flex items-center gap-2">
              <span className="font-mono">{r.currency}</span>
              <span className="font-mono">{r.rate}</span>
              <Badge variant="outline" className={r.ok ? "text-emerald-700" : "text-red-700"}>
                {r.ok ? "OK" : "Check"}
              </Badge>
              {r.message && <span className="text-muted-foreground">{r.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
