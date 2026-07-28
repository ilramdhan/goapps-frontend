import { generateMetadata as genMeta } from "@/config/site"
import ProductConfigPageClient from "./product-config-page-client"

export const metadata = genMeta("Product Config")

export default function ProductConfigPage() {
  return <ProductConfigPageClient />
}
