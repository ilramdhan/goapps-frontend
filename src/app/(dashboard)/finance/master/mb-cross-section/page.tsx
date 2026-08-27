import { generateMetadata as genMeta } from "@/config/site"
import MbCrossSectionPageClient from "./mb-cross-section-page-client"

export const metadata = genMeta("MB Cross Section")
export default function MbCrossSectionPage() {
  return <MbCrossSectionPageClient />
}
