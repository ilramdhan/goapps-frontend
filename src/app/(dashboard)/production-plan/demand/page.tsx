import { generateMetadata as genMeta } from "@/config/site"
import DemandPageClient from "./demand-page-client"

export const metadata = genMeta("Production Demand")

export default function DemandPage() {
  return <DemandPageClient />
}
