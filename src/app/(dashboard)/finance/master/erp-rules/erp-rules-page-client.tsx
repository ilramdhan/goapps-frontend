"use client"

import { Download, Info, Loader2 } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GradeGroupsTab, SellPricesTab, VallossRulesTab } from "@/components/finance/erp-rule"
import { useExportErpRules } from "@/hooks/finance/use-erp-rule"
import { usePermission } from "@/lib/hooks/use-permission"

export default function ErpRulesPageClient() {
  const { hasPermission } = usePermission()
  const exportMutation = useExportErpRules()

  return (
    <div className="space-y-6">
      <PageHeader title="ERP Rules" subtitle="Valuation loss rules, sell prices and grade groups used by ERP cost derivation.">
        {hasPermission("finance.cost.erprule.export") && (
          <Button variant="outline" onClick={() => exportMutation.mutate(undefined)} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export
          </Button>
        )}
      </PageHeader>

      <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        Rule changes apply to the next derive. Existing batches keep their snapshot.
      </div>

      <Tabs defaultValue="valloss">
        <TabsList>
          <TabsTrigger value="valloss">Valloss rules</TabsTrigger>
          <TabsTrigger value="sell">Sell prices</TabsTrigger>
          <TabsTrigger value="grades">Grade groups</TabsTrigger>
        </TabsList>
        <TabsContent value="valloss" className="mt-4"><VallossRulesTab /></TabsContent>
        <TabsContent value="sell" className="mt-4"><SellPricesTab /></TabsContent>
        <TabsContent value="grades" className="mt-4"><GradeGroupsTab /></TabsContent>
      </Tabs>
    </div>
  )
}
