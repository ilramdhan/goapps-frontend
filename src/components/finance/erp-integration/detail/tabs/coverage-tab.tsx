"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCreateErpProductFromDemand, useErpCoverage, useErpLinkReport, useExportErpCoverage } from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"

// Values mirror ErpCoverageStatus (enum name without prefix).
const FILTERS = ["", "OK", "NO_MAPPING", "DUP_MAPPING", "NO_COST", "NOT_APPROVED", "NOT_USD", "INVALID"]

export function CoverageTab({ batchId }: { batchId: number }) {
  const { hasPermission } = usePermission()
  const [status, setStatus] = useState("")
  const params = status ? { status } : undefined
  const { data } = useErpCoverage(batchId, params)
  const link = useErpLinkReport()
  const exp = useExportErpCoverage()
  const createProduct = useCreateErpProductFromDemand()
  const canCreate = hasPermission("finance.cost.erpintegration.update")
  const rows = data?.items ?? []
  const linkRows = link.data?.items ?? []
  const count = (c: string) => linkRows.filter((r) => r.category === c).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <Button key={f || "all"} size="sm" variant={status === f ? "default" : "outline"} onClick={() => setStatus(f)}>
            {f || "All"}
          </Button>
        ))}
        {hasPermission("finance.cost.erpintegration.export") && (
          <Button size="sm" variant="outline" disabled={exp.isPending} onClick={() => exp.mutate({ batchId, params })}>
            Export
          </Button>
        )}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ERP item</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.cecId}>
                <TableCell className="font-mono text-xs">{r.erpItemCode}</TableCell>
                <TableCell className="text-xs">{r.productCode || "—"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{r.qty}</TableCell>
                <TableCell className="text-xs">{r.status}</TableCell>
                <TableCell className="text-xs">{r.message}</TableCell>
                <TableCell className="space-x-2 text-right text-xs">
                  {r.status !== "OK" && (
                    <>
                      {canCreate && r.status === "NO_MAPPING" && !r.erpItemCode.toUpperCase().startsWith("CMB") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={createProduct.isPending}
                          onClick={() => {
                            if (window.confirm(`Create a product for ${r.erpItemCode} and link it?`)) {
                              createProduct.mutate({ batchId, cecId: r.cecId })
                            }
                          }}
                        >
                          Create product
                        </Button>
                      )}
                      <Link className="underline" href={`/finance/product-master?erpItemCode=${encodeURIComponent(r.erpItemCode)}`}>
                        Link to existing product
                      </Link>
                      <Link className="underline" href={`/finance/product-master?createFromErp=${encodeURIComponent(r.erpItemCode)}`}>
                        Open product master
                      </Link>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="space-y-2 p-4">
        <h3 className="text-sm font-medium">Link readiness</h3>
        <p className="text-xs text-muted-foreground">
          Duplicate groups: {count("duplicate")} · Linked but no shade: {count("linked_no_shade")} · Total issues: {linkRows.length}
        </p>
        <ul className="space-y-1 text-xs">
          {linkRows
            .filter((r) => r.category === "duplicate")
            .map((r, i) => (
              <li key={`${r.erpItemCode}-${i}`} className="font-mono">
                {r.erpItemCode} — {r.detail}
              </li>
            ))}
        </ul>
      </Card>
    </div>
  )
}
