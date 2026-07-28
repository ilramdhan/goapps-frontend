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

import type { ListWasteCategoryMastersParams } from "@/types/ppc/master"
import { AREA_OPTIONS, ACTIVE_FILTER_OPTIONS, AreaCode, ActiveFilter } from "@/types/ppc/common"

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "WASTE", label: "Waste" },
  { value: "DOWNGRADE", label: "Downgrade" },
]

interface WasteCategoriesFiltersProps {
  filters: ListWasteCategoryMastersParams
  onFiltersChange: (filters: ListWasteCategoryMastersParams) => void
}

export function WasteCategoriesFilters({ filters, onFiltersChange }: WasteCategoriesFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleAreaChange = (value: string) => {
    onFiltersChange({ ...filters, area: Number(value) as AreaCode, page: 1 })
  }

  const handleTypeChange = (value: string) => {
    onFiltersChange({ ...filters, type: value === "all" ? "" : value, page: 1 })
  }

  const handleActiveFilterChange = (value: string) => {
    onFiltersChange({ ...filters, activeFilter: Number(value) as ActiveFilter, page: 1 })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      area: AreaCode.AREA_CODE_UNSPECIFIED,
      type: "",
      activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
    })
  }

  const hasActiveFilters =
    filters.search ||
    (filters.area !== undefined && filters.area !== AreaCode.AREA_CODE_UNSPECIFIED) ||
    filters.type ||
    (filters.activeFilter !== undefined &&
      filters.activeFilter !== ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search code or name..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
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

        <Select value={filters.type || "all"} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.activeFilter ?? ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)}
          onValueChange={handleActiveFilterChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_FILTER_OPTIONS.map((option) => (
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
