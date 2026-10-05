import { generateMetadata as genMeta } from "@/config/site"
import { ErpIntegrationPageClient } from "@/components/finance/erp-integration"

export const metadata = genMeta("ERP Integration")

export default function ErpIntegrationPage() {
  return <ErpIntegrationPageClient />
}
