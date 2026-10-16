"use client"

import { Suspense, useState } from "react"
import { Plus, Download, Upload, Loader2 } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTablePagination } from "@/components/shared"
import {
  MachineTable,
  MachineFilters,
  MachineFormDialog,
  MachineDeleteDialog,
  MachineImportDialog,
} from "@/components/finance/machine"

import { useMachines, useExportMachines } from "@/hooks/finance/use-machine"
import { useLookupSyncAfterSave } from "@/hooks/finance/use-lookup-sync-after-save"
import { useUrlState } from "@/lib/hooks"
import {
  type Machine,
  type ListMachinesParams,
  ActiveFilter,
} from "@/types/finance/machine"

const defaultFilters: ListMachinesParams = {
  page: 1,
  pageSize: 20,
  search: "",
  activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
  sortBy: "code",
  sortOrder: "asc",
}

function MachinePageContent() {
  const [filters, setFilters] = useUrlState<ListMachinesParams>({
    defaultValues: defaultFilters,
  })

  const { onSaved: onLookupSaved, notice: lookupSyncNotice } = useLookupSyncAfterSave("MACHINE")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)

  const { data, isLoading, isError, error } = useMachines(filters)
  const exportMutation = useExportMachines()

  const handleAddNew = () => {
    setSelectedMachine(null)
    setIsFormOpen(true)
  }

  const handleEdit = (machine: Machine) => {
    setSelectedMachine(machine)
    setIsFormOpen(true)
  }

  const handleDelete = (machine: Machine) => {
    setSelectedMachine(machine)
    setIsDeleteOpen(true)
  }

  const handleExport = async () => {
    await exportMutation.mutateAsync({
      activeFilter: filters.activeFilter,
    })
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }))
  }

  const totalItems = Number(data?.pagination?.totalItems ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machines"
        subtitle="Manage machine master data for yarn costing"
      >
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {exportMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export/Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleExport}
                disabled={exportMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import from Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Machine
          </Button>
        </div>
      </PageHeader>

      {lookupSyncNotice}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Machine List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${totalItems} total machines`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MachineFilters filters={filters} onFiltersChange={setFilters} />

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
              {error instanceof Error
                ? error.message
                : "Failed to load machines"}
            </div>
          )}

          <MachineTable
            data={data?.data ?? []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <DataTablePagination
            currentPage={data?.pagination?.currentPage ?? 1}
            pageSize={data?.pagination?.pageSize ?? 10}
            totalItems={totalItems}
            totalPages={data?.pagination?.totalPages ?? 0}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      <MachineFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        machine={selectedMachine}
        onSuccess={() => {
          if (selectedMachine) onLookupSaved(selectedMachine.machineCode)
        }}
      />

      <MachineDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        machine={selectedMachine}
      />

      <MachineImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  )
}

function MachinePageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Machines" subtitle="Manage machine master data for yarn costing">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export/Import
          </Button>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Machine
          </Button>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Machine List</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MachinePageClient() {
  return (
    <Suspense fallback={<MachinePageSkeleton />}>
      <MachinePageContent />
    </Suspense>
  )
}
