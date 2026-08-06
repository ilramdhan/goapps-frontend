"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { useBreadcrumbOverride } from "@/components/common/dynamic-breadcrumb"
import { Button } from "@/components/ui/button"
import {
  RequestDetailPanel,
  RequestFormDialog,
} from "@/components/finance/cost-product-request"
import { useCostProductRequest } from "@/hooks/finance/use-cost-product-request"
import { useFillTasks } from "@/hooks/finance/use-fill-assignment"

interface Props {
  requestId: string
}

// ProductRequestDetailClient renders a single product request at its own URL
// (/finance/product-requests/[id]). Replaces the previous inline-detail render
// that left the URL stuck at the list.
export default function ProductRequestDetailClient({ requestId }: Props) {
  const router = useRouter()
  const numericId = Number(requestId)
  const { data: request, isLoading } = useCostProductRequest(
    Number.isFinite(numericId) && numericId > 0 ? numericId : undefined,
  )
  const isParameterPending = request?.status === "PARAMETER_PENDING"
  const { data: fillTasks = [] } = useFillTasks(numericId)
  const allFillsApproved =
    isParameterPending &&
    fillTasks.length > 0 &&
    fillTasks.every((t) => t.status === "FILL_TASK_STATUS_APPROVED")
  const [formOpen, setFormOpen] = useState(false)

  useBreadcrumbOverride(request?.requestNo ?? null)

  function backToList() {
    router.push("/finance/product-requests")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading…" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product Request">
          <Button variant="outline" onClick={backToList}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
          </Button>
        </PageHeader>
        <EmptyState
          title="Request not found"
          description={`No product request with id ${requestId}.`}
          action={<Button onClick={backToList}>Back to list</Button>}
        />
      </div>
    )
  }

  // Show fill tracking and param summary for all statuses after parameter collection starts.
  // UNDER_REVIEW excluded — fill tasks don't exist yet at that stage.
  // CONFIRMED/APPROVED/RELEASED included — param audit trail remains relevant throughout lifecycle.
  const hasFillTracking =
    request.status === "PARAMETER_PENDING" ||
    request.status === "PARAMETER_COMPLETE" ||
    request.status === "CONFIRMED" ||
    request.status === "APPROVED" ||
    request.status === "RELEASED" ||
    request.status === "COSTING_DONE" ||
    request.status === "QUOTED" ||
    (request.status === "CLOSED" && !!request.linkedRouteHeadId)

  return (
    <div className="space-y-6">
      <PageHeader title={request.requestNo} subtitle={request.title}>
        <Button variant="outline" onClick={backToList}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
      </PageHeader>

      <RequestDetailPanel
        request={request}
        onEdit={() => setFormOpen(true)}
        allFillsApproved={allFillsApproved}
        hasFillTracking={hasFillTracking}
      />

      <RequestFormDialog open={formOpen} onOpenChange={setFormOpen} request={request} />
    </div>
  )
}
