import { generateMetadata as genMeta } from "@/config/site"
import MbLusturePageClient from "./mb-lusture-page-client"

export const metadata = genMeta("MB Lusture")
export default function MbLusturePage() {
  return <MbLusturePageClient />
}
