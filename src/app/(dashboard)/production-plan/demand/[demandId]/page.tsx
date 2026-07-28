import { generateMetadata as genMeta } from "@/config/site"
import DemandDetailClient from "./demand-detail-client"

export const metadata = genMeta("Demand Detail")

export default async function DemandDetailPage({
  params,
}: {
  params: Promise<{ demandId: string }>
}) {
  const { demandId } = await params
  return <DemandDetailClient demandId={Number(demandId)} />
}
