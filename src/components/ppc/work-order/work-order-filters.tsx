"use client"

import { useCallback } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DebouncedSearchInput } from "@/components/common"
import { MachineCombobox, DemandCombobox, LotCombobox } from "@/components/ppc/comboboxes"

import type { ListWorkOrdersParams } from "@/types/ppc/work-order"
import { AREA_OPTIONS, WO_STATUS_OPTIONS, AreaCode, WOStatus } from "@/types/ppc/common"

interface WorkOrderFiltersProps {
  filters: ListWorkOrdersParams
  onFiltersChange: (filters: ListWorkOrdersParams) => void
}

export function WorkOrderFilters({ filters, onFiltersChange }: WorkOrderFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleAreaChange = (value: string) => {
    onFiltersChange({ ...filters, area: Number(value) as AreaCode, page: 1 })
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: Number(value) as WOStatus, page: 1 })
  }

  const handleNumberChange = (key: "machineId" | "demandId", value: number | undefined) => {
    onFiltersChange({ ...filters, [key]: value, page: 1 })
  }

  const handleLotChange = (value: string) => {
    onFiltersChange({ ...filters, lotNo: value, page: 1 })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      area: AreaCode.AREA_CODE_UNSPECIFIED,
      status: WOStatus.WO_STATUS_UNSPECIFIED,
      lotNo: "",
      machineId: undefined,
      demandId: undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    (filters.area !== undefined && filters.area !== AreaCode.AREA_CODE_UNSPECIFIED) ||
    (filters.status !== undefined && filters.status !== WOStatus.WO_STATUS_UNSPECIFIED) ||
    filters.machineId !== undefined ||
    filters.demandId !== undefined ||
    !!filters.lotNo

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search by WO no or product..."
        debounceMs={300}
        containerClassName="flex-1 lg:max-w-xs"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(filters.area ?? AreaCode.AREA_CODE_UNSPECIFIED)}
          onValueChange={handleAreaChange}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            {AREA_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.status ?? WOStatus.WO_STATUS_UNSPECIFIED)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {WO_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <MachineCombobox
          value={filters.machineId}
          onChange={(id) => handleNumberChange("machineId", id)}
          placeholder="Machine"
          className="w-[160px]"
        />

        <DemandCombobox
          value={filters.demandId}
          onChange={(id) => handleNumberChange("demandId", id)}
          placeholder="Demand"
          className="w-[160px]"
        />

        <LotCombobox
          value={filters.lotNo || undefined}
          onChange={(lotNo) => handleLotChange(lotNo)}
          placeholder="Lot"
          className="w-[160px]"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-10">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
