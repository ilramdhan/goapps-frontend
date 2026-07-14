import { generateMetadata as genMeta } from "@/config/site"
import MbParamPageClient from "./mb-param-page-client"

export const metadata = genMeta("MB Param")
export default function MbParamPage() {
  return <MbParamPageClient />
}
