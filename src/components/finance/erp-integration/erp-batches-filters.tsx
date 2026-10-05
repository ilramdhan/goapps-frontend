"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface ErpBatchesFiltersValue {
  period?: string
  status?: string
}

interface Props {
  value: ErpBatchesFiltersValue
  onChange: (next: ErpBatchesFiltersValue) => void
}

export const ERP_BATCH_STATUSES = [
  "DRAFT",
  "DEMAND_LOADED",
  "COVERED",
  "DERIVED",
  "VALIDATED",
  "PUSHED",
  "VALUATED",
  "RECONCILED",
  "LOCKED",
  "FAILED",
  "SUPERSEDED",
]

export function ErpBatchesFilters({ value, onChange }: Props) {
  const hasFilters = Boolean(value.period || value.status)
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Period</label>
          <Input
            placeholder="YYYYMM"
            value={value.period ?? ""}
            onChange={(e) => onChange({ ...value, period: e.target.value })}
            className="w-32"
            maxLength={6}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={value.status || "ALL"}
            onValueChange={(v) => onChange({ ...value, status: v === "ALL" ? "" : v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {ERP_BATCH_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ period: "", status: "" })}>
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </div>
    </Card>
  )
}
