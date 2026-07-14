import { generateMetadata as genMeta } from "@/config/site"
import MbRecipePageClient from "./mb-recipe-page-client"

export const metadata = genMeta("MB Recipe")
export default function MbRecipePage() {
  return <MbRecipePageClient />
}
