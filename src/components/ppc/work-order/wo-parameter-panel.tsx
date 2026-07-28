"use client"

import { useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProductCombobox } from "@/components/ppc/comboboxes"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/common"

import type { WorkOrder, WOParameter, ResolvedParam } from "@/types/ppc/work-order"
import { ParamResolutionSource } from "@/types/ppc/common"
import { useResolveWOParameters } from "@/hooks/ppc/use-work-order"

const RESOLUTION_SOURCE_LABELS: Record<number, string> = {
  [ParamResolutionSource.PARAM_RESOLUTION_SOURCE_UNSPECIFIED]: "-",
  [ParamResolutionSource.PARAM_RESOLUTION_SOURCE_WO_REF]: "WO Ref",
  [ParamResolutionSource.PARAM_RESOLUTION_SOURCE_PRODUCT_MACHINE]: "Product+Machine",
  [ParamResolutionSource.PARAM_RESOLUTION_SOURCE_PRODUCT]: "Product",
  [ParamResolutionSource.PARAM_RESOLUTION_SOURCE_DEFAULT]: "Default",
}

function ppcValue(p: WOParameter): string {
  if (p.dataType === "NUMBER") return p.valuePpcNum || "-"
  if (p.dataType === "TEXT") return p.valuePpcText || "-"
  if (p.dataType === "BOOLEAN") return p.valuePpcFlag ? "Yes" : "No"
  return "-"
}

function pcValue(p: WOParameter): string {
  if (p.dataType === "NUMBER") return p.valuePcNum || "-"
  if (p.dataType === "TEXT") return p.valuePcText || "-"
  if (p.dataType === "BOOLEAN") return p.valuePcFlag ? "Yes" : "No"
  return "-"
}

function resolvedValue(p: ResolvedParam): string {
  if (p.dataType === "NUMBER") return p.valueNum || "-"
  if (p.dataType === "TEXT") return p.valueText || "-"
  if (p.dataType === "BOOLEAN") return p.valueFlag ? "Yes" : "No"
  return "-"
}

interface WOParameterPanelProps {
  workOrder: WorkOrder
}

export function WOParameterPanel({ workOrder }: WOParameterPanelProps) {
  const params = [...(workOrder.parameters ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)
  const anyDual = params.some((p) => p.isDual)

  // Resolve preview: needs the product sys id. Phase-1 exposes a manual number
  // input because the WO projection does not carry cpmProductSysId — the code
  // (cpmProductCode) is denormalized but not the numeric sys id the resolver
  // needs. Machine id comes from the WO. Best-effort preview, not persisted.
  const resolveMutation = useResolveWOParameters()
  const [productSysId, setProductSysId] = useState("")
  const [resolved, setResolved] = useState<ResolvedParam[] | null>(null)

  const handleResolve = async () => {
    const sysId = Number(productSysId)
    if (!Number.isFinite(sysId) || sysId <= 0) return
    const data = await resolveMutation.mutateAsync({
      cpmProductSysId: sysId,
      machineId: workOrder.machineId,
      displayGroup: "Machine",
    })
    setResolved(data)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Parameters</CardTitle>
        <span className="text-xs text-muted-foreground">{params.length} params</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.length === 0 ? (
          <EmptyState
            title="No parameters"
            description="Parameters are materialized when the work order is created or resolved."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Code</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead className="w-[110px]">Group</TableHead>
                  <TableHead className="w-[120px]">PPC Value</TableHead>
                  {anyDual && <TableHead className="w-[120px]">PC Value</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.map((p) => (
                  <TableRow key={p.wopId}>
                    <TableCell className="font-mono text-xs">{p.paramCode}</TableCell>
                    <TableCell>{p.paramName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.displayGroup || "-"}
                    </TableCell>
                    <TableCell>{ppcValue(p)}</TableCell>
                    {anyDual && (
                      <TableCell>{p.isDual ? pcValue(p) : <span className="text-muted-foreground">-</span>}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Resolve preview (best-effort — see comment above). */}
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Product (for resolve preview)</label>
              <ProductCombobox
                value={productSysId ? Number(productSysId) : undefined}
                onChange={(id) => setProductSysId(String(id))}
                className="w-[240px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResolve}
              disabled={resolveMutation.isPending || !productSysId}
            >
              {resolveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Resolve Parameters
            </Button>
          </div>

          {resolved && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Code</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead className="w-[120px]">Resolved</TableHead>
                    <TableHead className="w-[140px]">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolved.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No resolved parameters
                      </TableCell>
                    </TableRow>
                  ) : (
                    resolved.map((p) => (
                      <TableRow key={p.paramId}>
                        <TableCell className="font-mono text-xs">{p.paramCode}</TableCell>
                        <TableCell>{p.paramName}</TableCell>
                        <TableCell>{resolvedValue(p)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {RESOLUTION_SOURCE_LABELS[p.source] ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
