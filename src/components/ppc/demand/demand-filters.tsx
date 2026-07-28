"use client"

import { useCallback } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DebouncedSearchInput } from "@/components/common"

import type { ListDemandsParams } from "@/types/ppc/demand"
import {
  DemandStatus,
  DemandType,
  DEMAND_STATUS_OPTIONS,
  DEMAND_TYPE_OPTIONS,
} from "@/types/ppc/common"

interface DemandFiltersProps {
  filters: ListDemandsParams
  onFiltersChange: (filters: ListDemandsParams) => void
  /** When set, the type filter is fixed (tab-scoped) and the type select is hidden. */
  lockedType?: DemandType
}

export function DemandFilters({ filters, onFiltersChange, lockedType }: DemandFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleMonthChange = (value: string) => {
    onFiltersChange({ ...filters, month: value, page: 1 })
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: Number(value) as DemandStatus, page: 1 })
  }

  const handleTypeChange = (value: string) => {
    onFiltersChange({ ...filters, type: Number(value) as DemandType, page: 1 })
  }

  const handleClear = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      month: "",
      status: DemandStatus.DEMAND_STATUS_UNSPECIFIED,
      type: lockedType ?? DemandType.DEMAND_TYPE_UNSPECIFIED,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    !!filters.month ||
    (filters.status !== undefined && filters.status !== DemandStatus.DEMAND_STATUS_UNSPECIFIED) ||
    (lockedType === undefined &&
      filters.type !== undefined &&
      filters.type !== DemandType.DEMAND_TYPE_UNSPECIFIED)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search product, contract..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="month"
          value={filters.month || ""}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-[150px]"
          aria-label="Month"
        />

        <Select
          value={String(filters.status ?? DemandStatus.DEMAND_STATUS_UNSPECIFIED)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {DEMAND_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {lockedType === undefined && (
          <Select
            value={String(filters.type ?? DemandType.DEMAND_TYPE_UNSPECIFIED)}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {DEMAND_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-10">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
