import { generateMetadata as genMeta } from "@/config/site"
import RoutesPageClient from "./routes-page-client"

export const metadata = genMeta("Product Routes")

export default function RoutesPage() {
  return <RoutesPageClient />
}
