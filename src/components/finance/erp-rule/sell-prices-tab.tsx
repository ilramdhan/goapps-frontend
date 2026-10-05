"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSellPrices } from "@/hooks/finance/use-erp-rule"
import { usePermission } from "@/lib/hooks/use-permission"
import type { SellPrice } from "@/types/finance/erp-rule"
import { SellPriceFormDialog } from "./sell-price-form-dialog"

export const SELL_PRICE_BASES = ["SPPTY", "SPITY", "SPBSD"]

export function SellPricesTab() {
  const { hasPermission } = usePermission()
  const { data, isLoading } = useSellPrices()
  const [editing, setEditing] = useState<SellPrice | null>(null)
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Basis</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
          ) : items.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No sell prices</TableCell></TableRow>
          ) : (
            items.map((p) => (
              <TableRow key={p.basis}>
                <TableCell>{p.basis}</TableCell>
                <TableCell className="font-mono">{p.price}</TableCell>
                <TableCell><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>{p.updatedAt}</TableCell>
                <TableCell className="text-right">
                  {hasPermission("finance.cost.erprule.update") && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit price</Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <SellPriceFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sellPrice={editing} />
    </div>
  )
}
