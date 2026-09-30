import { generateMetadata as genMeta } from "@/config/site"
import YarnTxWeightPageClient from "./yarn-tx-weight-page-client"

export const metadata = genMeta("Yarn TX Weight")
export default function YarnTxWeightPage() {
  return <YarnTxWeightPageClient />
}
