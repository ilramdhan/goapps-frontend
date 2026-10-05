import { ErpBatchDetailClient } from "@/components/finance/erp-integration/detail/erp-batch-detail-client"

interface Props {
  params: Promise<{ batchId: string }>
}

export default async function ErpBatchDetailPage({ params }: Props) {
  const { batchId } = await params
  return <ErpBatchDetailClient batchId={Number(batchId)} />
}

export const dynamic = "force-dynamic"
