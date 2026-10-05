"use client"

import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useErpConfig } from "@/hooks/finance/use-erp-integration"

/** Lists which ERP write capabilities are switched off (all flags default OFF). */
export function ErpConfigBanner() {
  const { data: config } = useErpConfig()
  if (!config) return null

  const off: string[] = []
  if (config.writerMode === "disabled") off.push("Oracle writer is disabled")
  if (!config.pushEnabled) off.push("Push is off")
  if (!config.valuationEnabled) off.push("Valuation is off")
  if (!config.adjApproveEnabled) off.push("ADJ approve is off")
  if (off.length === 0) return null

  return (
    <Alert data-testid="erp-config-banner">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Some ERP write actions are disabled</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {off.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
