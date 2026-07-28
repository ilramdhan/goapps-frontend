import { generateMetadata as genMeta } from "@/config/site"
import WasteCategoriesPageClient from "./waste-categories-page-client"

export const metadata = genMeta("Waste Categories")

export default function WasteCategoriesPage() {
  return <WasteCategoriesPageClient />
}
