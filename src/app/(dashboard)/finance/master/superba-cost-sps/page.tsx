import { generateMetadata as genMeta } from "@/config/site"
import SuperbaCostSpsPageClient from "./superba-cost-sps-page-client"

export const metadata = genMeta("Superba Cost SP")

export default function SuperbaCostSpsPage() {
  return <SuperbaCostSpsPageClient />
}
