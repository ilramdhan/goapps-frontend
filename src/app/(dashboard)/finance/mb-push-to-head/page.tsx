import { generateMetadata as genMeta } from "@/config/site"
import MbPushToHeadPageClient from "./mb-push-to-head-page-client"

export const metadata = genMeta("MB Push to Head")
export default function MbPushToHeadPage() {
  return <MbPushToHeadPageClient />
}
