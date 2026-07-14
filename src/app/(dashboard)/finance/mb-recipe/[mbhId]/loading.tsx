import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
