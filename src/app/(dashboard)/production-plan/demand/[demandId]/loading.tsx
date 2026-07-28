export default function DemandDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-64 animate-pulse rounded-lg bg-muted lg:col-span-8" />
        <div className="h-64 animate-pulse rounded-lg bg-muted lg:col-span-4" />
      </div>
    </div>
  )
}
