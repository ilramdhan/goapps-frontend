"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { useErpBatch } from "@/hooks/finance/use-erp-integration"
import { cn } from "@/lib/utils"

import { statusTone } from "../erp-batches-table"
import { ErpConfigBanner } from "../erp-config-banner"
import { ErpJobProgress } from "./erp-job-progress"
import { ErpStepActions } from "./erp-step-actions"
import { AdjValuationTab } from "./tabs/adj-valuation-tab"
import { CoverageTab } from "./tabs/coverage-tab"
import { OracleCallsTab } from "./tabs/oracle-calls-tab"
import { OverviewTab } from "./tabs/overview-tab"
import { PushTab } from "./tabs/push-tab"
import { ReconTab } from "./tabs/recon-tab"
import { StdCostTab } from "./tabs/std-cost-tab"

export function ErpBatchDetailClient({ batchId }: { batchId: number }) {
  const { data: batch, isLoading, error } = useErpBatch(batchId)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const clearJob = useCallback(() => setActiveJobId(null), [])

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (error || !batch) {
    return (
      <EmptyState
        title="Batch not found"
        description={`No ERP batch with ID ${batchId}.`}
        action={
          <Button asChild variant="outline">
            <Link href="/finance/erp-integration">Back to list</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`ERP batch #${batch.batchId}`} subtitle={`Period ${batch.period} · seq ${batch.seq}`}>
        <Button asChild variant="outline">
          <Link href="/finance/erp-integration">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
      </PageHeader>
      <ErpConfigBanner />
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{batch.mode}</Badge>
        <Badge variant="outline" className={cn(statusTone(batch.status))}>
          {batch.status}
        </Badge>
        <span className="font-mono text-xs">{batch.progress}%</span>
      </div>
      {activeJobId && <ErpJobProgress jobId={activeJobId} batchId={batchId} onDone={clearJob} />}
      {batch.mode === "SHADOW" ? (
        <p className="text-sm text-muted-foreground" data-testid="shadow-note">
          SHADOW batch: read-only comparison. It is never pushed to Oracle.
        </p>
      ) : (
        <ErpStepActions batch={batch} onJobStarted={setActiveJobId} />
      )}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="std-cost">Std cost</TabsTrigger>
          <TabsTrigger value="push">Push</TabsTrigger>
          <TabsTrigger value="adj">ADJ valuation</TabsTrigger>
          <TabsTrigger value="recon">Recon</TabsTrigger>
          <TabsTrigger value="calls">Oracle calls</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab batch={batch} /></TabsContent>
        <TabsContent value="coverage" className="mt-4"><CoverageTab batchId={batchId} /></TabsContent>
        <TabsContent value="std-cost" className="mt-4"><StdCostTab batchId={batchId} /></TabsContent>
        <TabsContent value="push" className="mt-4"><PushTab batch={batch} onJobStarted={setActiveJobId} /></TabsContent>
        <TabsContent value="adj" className="mt-4"><AdjValuationTab batch={batch} onJobStarted={setActiveJobId} /></TabsContent>
        <TabsContent value="recon" className="mt-4"><ReconTab batch={batch} onJobStarted={setActiveJobId} /></TabsContent>
        <TabsContent value="calls" className="mt-4"><OracleCallsTab batchId={batchId} /></TabsContent>
      </Tabs>
    </div>
  )
}
