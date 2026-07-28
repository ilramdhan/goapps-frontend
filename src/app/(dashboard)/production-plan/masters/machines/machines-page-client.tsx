"use client"

import { useState, Suspense } from "react"
import { RefreshCw, Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common"
import { DataTablePagination } from "@/components/shared"

import { MachinesTable, MachinesFilters, MachineFormDialog } from "@/components/ppc/machines"

import { useMachines, useSyncMachines } from "@/hooks/ppc/use-machine"
import { useUrlState } from "@/lib/hooks"
import type { Machine, ListMachinesParams } from "@/types/ppc/master"
import { AreaCode, ActiveFilter } from "@/types/ppc/common"

const defaultFilters: ListMachinesParams = {
  page: 1,
  pageSize: 10,
  search: "",
  area: AreaCode.AREA_CODE_UNSPECIFIED,
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
}

function MachinesContent() {
  const [filters, setFilters] = useUrlState<ListMachinesParams>({
    defaultValues: defaultFilters,
  })

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selected, setSelected] = useState<Machine | null>(null)

  const { data, isLoading, isError, error } = useMachines(filters)
  const syncMutation = useSyncMachines()

  const handleEdit = (machine: Machine) => {
    setSelected(machine)
    setIsFormOpen(true)
  }

  const totalItems = data?.pagination?.totalItems ?? 0

  return (
    <div>
      <PageHeader title="Machines" subtitle="Machine master (synced from Oracle) with planning fields">
        <Button
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Machine List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total machines`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MachinesFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error ? error.message : "Failed to load machines"}
            </div>
          )}

          <MachinesTable data={data?.data || []} isLoading={isLoading} onEdit={handleEdit} />

          {totalItems > 0 && (
            <DataTablePagination
              currentPage={data?.pagination?.currentPage ?? 1}
              pageSize={data?.pagination?.pageSize ?? 10}
              totalItems={totalItems}
              totalPages={data?.pagination?.totalPages ?? 0}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
            />
          )}
        </CardContent>
      </Card>

      <MachineFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} machine={selected} />
    </div>
  )
}

export default function MachinesPageClient() {
  return (
    <Suspense fallback={null}>
      <MachinesContent />
    </Suspense>
  )
}
