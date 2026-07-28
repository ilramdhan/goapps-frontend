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

import type { ListMachineGroupsParams } from "@/types/ppc/master"
import { AREA_OPTIONS, AreaCode } from "@/types/ppc/common"

interface MachineGroupsFiltersProps {
  filters: ListMachineGroupsParams
  onFiltersChange: (filters: ListMachineGroupsParams) => void
}

export function MachineGroupsFilters({ filters, onFiltersChange }: MachineGroupsFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleAreaChange = (value: string) => {
    onFiltersChange({ ...filters, area: Number(value) as AreaCode, page: 1 })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      area: AreaCode.AREA_CODE_UNSPECIFIED,
    })
  }

  const hasActiveFilters =
    filters.search || (filters.area !== undefined && filters.area !== AreaCode.AREA_CODE_UNSPECIFIED)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search group name..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(filters.area ?? AreaCode.AREA_CODE_UNSPECIFIED)}
          onValueChange={handleAreaChange}
        >
          <SelectTrigger className="w-[140px]">
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
