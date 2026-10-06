import { Skeleton } from "@/components/ui/skeleton"

export default function ErpBatchDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
