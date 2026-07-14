"use client"

import Link from "next/link"
import { ArrowLeft, Beaker } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/common/page-header"
import { StatusBadge } from "@/components/common/status-badge"
import { useBreadcrumbOverride } from "@/components/common/dynamic-breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/common/empty-state"
import { useMBHead } from "@/hooks/finance/use-mb-head"
import {
  MbCompositionTab,
  MbParametersTab,
  MbWorkflowLogTab,
  MbRecipeActionBar,
} from "@/components/finance/mb-recipe"

interface Props {
  mbhId: string
}

export default function MbRecipeDetailClient({ mbhId }: Props) {
  const { data, isLoading } = useMBHead(mbhId)
  const mbHead = data?.data

  useBreadcrumbOverride(mbHead ? mbHead.devCode || mbHead.mbhMbCosting || null : null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading…" />
      </div>
    )
  }

  if (!mbHead) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/finance/mb-recipe">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to MB Recipe list
          </Link>
        </Button>
        <EmptyState title="MB Recipe not found" description="The requested MB Head does not exist." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/finance/mb-recipe">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to MB Recipe list
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={`${mbHead.devCode || mbHead.mbhMbCosting} — ${mbHead.shadeName || mbHead.shadeCode || ""}`}
          subtitle={`Version ${mbHead.currentVersion}`}
        />
        <MbRecipeActionBar mbHead={mbHead} />
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Identity
            <StatusBadge status={mbHead.entryStatus} type="mbhead" size="sm" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Dev Code" value={mbHead.devCode || "—"} mono />
          <Field label="Shade Code" value={mbHead.shadeCode || "—"} mono />
          <Field label="Shade Name" value={mbHead.shadeName || "—"} />
          <Field label="MB Costing" value={mbHead.mbhMbCosting || "—"} mono />
          <Field label="Cross Section" value={mbHead.crossSection || "—"} />
          <Field label="Lusture Code" value={mbHead.lustureCode || "—"} mono />
          <Field label="Bought-out" value={mbHead.isBoughtout ? "Yes" : "No"} />
          {mbHead.stateReason && (
            <div className="col-span-full">
              <Field label="State Reason" value={mbHead.stateReason} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="composition">
        <TabsList>
          <TabsTrigger value="composition">Composition</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="workflow-log">Workflow log</TabsTrigger>
        </TabsList>
        <TabsContent value="composition" className="mt-4">
          <MbCompositionTab mbhId={mbHead.mbhId} entryStatus={mbHead.entryStatus} />
        </TabsContent>
        <TabsContent value="parameters" className="mt-4">
          <MbParametersTab mbHead={mbHead} />
        </TabsContent>
        <TabsContent value="workflow-log" className="mt-4">
          <MbWorkflowLogTab mbhId={mbHead.mbhId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  )
}
