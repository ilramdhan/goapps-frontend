import { generateMetadata as genMeta } from "@/config/site"
import ErpRulesPageClient from "./erp-rules-page-client"

export const metadata = genMeta("ERP Rules")
export default function ErpRulesPage() {
  return <ErpRulesPageClient />
}
