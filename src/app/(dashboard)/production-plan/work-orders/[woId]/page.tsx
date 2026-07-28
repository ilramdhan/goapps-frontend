import { generateMetadata as genMeta } from "@/config/site"
import WorkOrderDetailClient from "./work-order-detail-client"

export const metadata = genMeta("Work Order")

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ woId: string }>
}) {
  const { woId } = await params
  return <WorkOrderDetailClient woId={Number(woId)} />
}
