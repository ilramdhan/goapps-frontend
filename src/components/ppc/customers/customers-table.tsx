"use client"

import { Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { StatusBadge } from "@/components/common"

import type { Customer } from "@/types/ppc/customer"
import { CUSTOMER_SOURCE_ORACLE } from "@/types/ppc/customer"

interface CustomersTableProps {
  data: Customer[]
  isLoading?: boolean
  onEdit: (customer: Customer) => void
}

function formatTimestamp(iso: string): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString()
}

export function CustomersTable({ data, isLoading, onEdit }: CustomersTableProps) {
  const columns: ColumnDef<Customer>[] = [
    {
      id: "customerCode",
      header: "Code",
      cell: (row) => <span className="font-medium font-mono">{row.customerCode || "-"}</span>,
    },
    {
      id: "customerName",
      header: "Name",
      cell: (row) => row.customerName || "-",
    },
    {
      id: "customerShortName",
      header: "Short Name",
      hideOnMobile: true,
      cell: (row) => row.customerShortName || "-",
    },
    {
      id: "customerTaxNo",
      header: "Tax No",
      hideOnMobile: true,
      cellClassName: "font-mono text-xs",
      cell: (row) => row.customerTaxNo || "-",
    },
    {
      id: "customerSource",
      header: "Source",
      cell: (row) => (
        <Badge variant={row.customerSource === CUSTOMER_SOURCE_ORACLE ? "secondary" : "outline"}>
          {row.customerSource === CUSTOMER_SOURCE_ORACLE ? "Orion" : "Manual"}
        </Badge>
      ),
    },
    {
      id: "customerIsActive",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.customerIsActive ? "ACTIVE" : "INACTIVE"} type="generic" />
      ),
    },
    {
      id: "syncedAt",
      header: "Last Synced",
      hideOnMobile: true,
      cellClassName: "text-muted-foreground",
      cell: (row) => formatTimestamp(row.syncedAt),
    },
  ]

  const actions: RowAction<Customer>[] = [
    {
      id: "edit",
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
    },
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      keyField="customerId"
      actions={actions}
      isLoading={isLoading}
      emptyMessage="No customers found"
      emptyDescription="Try adjusting your filters, or run a sync from Orion"
    />
  )
}
