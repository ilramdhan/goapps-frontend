"use client"

// MbParametersTab — read-only parameter preview. The backend has no per-head parameter
// override mechanism: pre-VALIDATED shows the live global defaults (mb_param master) as a
// preview of what will be frozen; post-VALIDATED shows the actual frozen mbHead.param* fields.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useMbParams } from "@/hooks/finance/use-mb-param"
import type { MBHead } from "@/types/finance/mb-head"

interface Props {
  mbHead: MBHead
}

const FROZEN_STATUSES = new Set(["VALIDATED", "UN_APPROVED", "REVOKED"])

export function MbParametersTab({ mbHead }: Props) {
  const isFrozen = FROZEN_STATUSES.has(mbHead.entryStatus)
  const { data, isLoading } = useMbParams({ pageSize: 100 })
  const globalParams = data?.items ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Parameters</CardTitle>
        <p className="text-xs text-muted-foreground">
          {isFrozen
            ? "Parameters frozen at validation time. Read-only."
            : "Live global parameter defaults — preview only, frozen once validated."}
        </p>
      </CardHeader>
      <CardContent>
        {isFrozen ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Field label="Waste" value={mbHead.paramWaste} />
            <Field label="Quality loss" value={mbHead.paramQualityLoss} />
            <Field label="Efficiency" value={mbHead.paramEfficiency} />
            <Field label="Dev expense" value={mbHead.paramDevExpense} />
            <Field label="Packing" value={mbHead.paramPacking} />
            <Field label="MB prod/day" value={mbHead.paramMbProdPerDay} />
            <Field label="Throughput/hour" value={mbHead.paramThroughputPerHour} />
            <Field label="No. of process" value={mbHead.paramNoOfProcess} />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {globalParams.map((p) => (
              <Field
                key={p.mbpId}
                label={p.name}
                value={p.type === "PICKLIST" ? p.defaultOption : p.defaultValue}
                unit={p.unit}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Field({ label, value, unit }: { label: string; value?: string | number | null; unit?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">
        {value === null || value === undefined || value === "" ? "—" : value}
        {unit ? ` ${unit}` : ""}
      </div>
    </div>
  )
}
