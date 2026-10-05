"use client"

import { useState } from "react"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useErpStdCost } from "@/hooks/finance/use-erp-integration"

export function StdCostTab({ batchId }: { batchId: number }) {
  const [status, setStatus] = useState("")
  const [source, setSource] = useState("")
  const [basis, setBasis] = useState("")
  const params: Record<string, string> = {}
  if (status) params.status = status
  if (source) params.source = source
  if (basis) params.basis = basis
  const { data } = useErpStdCost(batchId, params)
  const rows = data?.items ?? []
  const input = (label: string, v: string, set: (s: string) => void) => (
    <input
      aria-label={label}
      placeholder={label}
      value={v}
      onChange={(e) => set(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
    />
  )
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {input("Status", status, setStatus)}
        {input("Source", source, setSource)}
        {input("Basis", basis, setBasis)}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ERP item</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Derive</TableHead>
              <TableHead>Recon</TableHead>
              <TableHead className="text-right">Std cost</TableHead>
              <TableHead className="text-right">Oracle</TableHead>
              <TableHead className="text-right">Diff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.erpItemCode}</TableCell>
                <TableCell className="text-xs">{r.basis}</TableCell>
                <TableCell className="text-xs">{r.source}</TableCell>
                <TableCell className="text-xs">{r.deriveStatus}</TableCell>
                <TableCell className="text-xs">{r.reconStatus}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.stdCost}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.oracleStdCost}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.diff}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
