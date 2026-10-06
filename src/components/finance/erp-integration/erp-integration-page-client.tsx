"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { usePermission } from "@/lib/hooks/use-permission"
import { useUrlState } from "@/lib/hooks"
import { useErpBatches } from "@/hooks/finance/use-erp-integration"

import { CreateBatchDialog } from "./create-batch-dialog"
import { ErpBacktestPanel } from "./erp-backtest-panel"
import { ErpBacktestReportDialog } from "./erp-backtest-report-dialog"
import { ErpBatchesFilters } from "./erp-batches-filters"
import { ErpBatchesTable } from "./erp-batches-table"
import { ErpConfigBanner } from "./erp-config-banner"
import { ErpScheduleCard } from "./erp-schedule-card"

interface Filters {
  period: string
  status: string
  page: number
  pageSize: number
}

const defaultFilters: Filters = { period: "", status: "", page: 1, pageSize: 20 }

export function ErpIntegrationPageClient() {
  const { hasPermission } = usePermission()
  const canTrigger = hasPermission("finance.cost.erpintegration.trigger")
  const [open, setOpen] = useState(false)
  const [reportBatchId, setReportBatchId] = useState<number | null>(null)
  const [filters, setFilters] = useUrlState<Filters>({ defaultValues: defaultFilters })

  const { data, isLoading } = useErpBatches({
    period: filters.period || undefined,
    status: filters.status || undefined,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="ERP Integration"
        subtitle="Load demand, validate, and push standard cost to the ERP — step by step."
      >
        {canTrigger && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create batch
          </Button>
        )}
      </PageHeader>

      <ErpConfigBanner />

      <div className="grid gap-4 lg:grid-cols-2">
        <ErpBacktestPanel />
        <ErpScheduleCard />
      </div>

      <ErpBatchesFilters
        value={{ period: filters.period, status: filters.status }}
        onChange={(next) =>
          setFilters({ ...filters, period: next.period ?? "", status: next.status ?? "", page: 1 })
        }
      />

      <ErpBatchesTable
        items={data?.items ?? []}
        isLoading={isLoading}
        page={data?.pagination.currentPage || filters.page || 1}
        total={data?.pagination.totalItems ?? 0}
        totalPages={data?.pagination.totalPages || 1}
        onPageChange={(page) => setFilters({ ...filters, page })}
        onViewReport={(b) => setReportBatchId(b.batchId)}
      />

      <CreateBatchDialog open={open} onOpenChange={setOpen} />
      <ErpBacktestReportDialog
        batchId={reportBatchId}
        onOpenChange={(o) => !o && setReportBatchId(null)}
      />
    </div>
  )
}
