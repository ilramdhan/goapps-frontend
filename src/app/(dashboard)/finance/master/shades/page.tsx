import { generateMetadata as genMeta } from "@/config/site"
import ShadesPageClient from "./shades-page-client"

export const metadata = genMeta("Shade Master")

export default function ShadesPage() {
  return <ShadesPageClient />
}
