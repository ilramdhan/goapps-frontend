"use client"

// PaperTubeName — displays a product spec's tube classification.
// Prefers the fixed Paper/Plastic `tubeType` enum (product-request-workflow-
// revamp D3) when set — a static label, no lookup needed. Falls back to
// resolving the legacy `cost_paper_tube_type` master-data ID (via the
// TanStack-cached useCostPaperTubeTypes hook) for historical rows that only
// have `paperTubeTypeId` and no `tubeType`.
import { useCostPaperTubeTypes } from "@/hooks/finance/use-cost-paper-tube-type"
import { TubeType } from "@/types/generated/finance/v1/cost_product_request"

interface Props {
  id: number | undefined | null
  tubeType?: TubeType
  className?: string
}

const TUBE_TYPE_LABELS: Partial<Record<TubeType, string>> = {
  [TubeType.TUBE_TYPE_PAPER]: "Paper",
  [TubeType.TUBE_TYPE_PLASTIC]: "Plastic",
}

export function PaperTubeName({ id, tubeType, className }: Props) {
  const legacyLookupEnabled = !tubeType && !!id
  const { data, isLoading } = useCostPaperTubeTypes()

  if (tubeType) {
    const label = TUBE_TYPE_LABELS[tubeType]
    if (label) return <span className={className}>{label}</span>
  }

  if (!legacyLookupEnabled) return <span className={className}>—</span>
  if (isLoading) return <span className={className}>Loading…</span>
  const match = (data ?? []).find((p) => p.paperTubeTypeId === id)
  if (!match) {
    return (
      <span className={className} title={`#${id}`}>
        Unknown paper tube
      </span>
    )
  }
  return (
    <span className={className} title={`#${id}`}>
      {match.code} — {match.displayName}
    </span>
  )
}
