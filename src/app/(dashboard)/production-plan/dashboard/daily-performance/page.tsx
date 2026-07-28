import { generateMetadata as genMeta } from "@/config/site"
import DailyPerformanceClient from "./daily-performance-client"

export const metadata = genMeta("Daily Performance")

export default function DailyPerformancePage() {
  return <DailyPerformanceClient />
}
