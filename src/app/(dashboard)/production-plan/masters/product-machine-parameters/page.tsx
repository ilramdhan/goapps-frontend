import { generateMetadata as genMeta } from "@/config/site"
import ParametersPageClient from "./parameters-page-client"

export const metadata = genMeta("Product Machine Parameters")

export default function ParametersPage() {
  return <ParametersPageClient />
}
