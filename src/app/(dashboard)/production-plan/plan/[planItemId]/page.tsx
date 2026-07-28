import { generateMetadata as genMeta } from "@/config/site"
import PlanItemDetailClient from "./plan-item-detail-client"

export const metadata = genMeta("Plan Item Detail")

export default async function PlanItemDetailPage({
  params,
}: {
  params: Promise<{ planItemId: string }>
}) {
  const { planItemId } = await params
  return <PlanItemDetailClient planItemId={Number(planItemId)} />
}
