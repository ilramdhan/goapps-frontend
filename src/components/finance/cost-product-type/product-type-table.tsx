"use client"

import { Droplet, Edit } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CostProductType } from "@/types/finance/cost-product-type"

interface Props {
  items: CostProductType[]
  isLoading?: boolean
  onEdit: (t: CostProductType) => void
  onOilConfig: (t: CostProductType) => void
}

export function ProductTypeTable({ items, isLoading, onEdit, onOilConfig }: Props) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No product types yet.
              </TableCell>
            </TableRow>
          )}
          {items.map((t) => (
            <TableRow key={t.typeId}>
              <TableCell className="font-mono text-xs">{t.typeCode}</TableCell>
              <TableCell>{t.typeName}</TableCell>
              <TableCell>
                {t.isActive ? (
                  <Badge variant="secondary">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => onOilConfig(t)} title="Oil config">
                  <Droplet className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onEdit(t)} title="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
