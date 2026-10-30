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

import { ActiveFilter, ACTIVE_FILTER_OPTIONS, type ListMBSpinsParams } from "@/types/finance/mb-spin"

interface MBSpinFiltersProps {
  filters: ListMBSpinsParams
  onFiltersChange: (filters: ListMBSpinsParams) => void
}

export function MBSpinFilters({ filters, onFiltersChange }: MBSpinFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleActiveFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      activeFilter: Number(value) as ActiveFilter,
      page: 1,
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
      sortBy: "code",
      sortOrder: "asc",
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    (filters.activeFilter !== undefined &&
      filters.activeFilter !== ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-")
    onFiltersChange({ ...filters, sortBy, sortOrder })
  }

  const currentSort = `${filters.sortBy || "code"}-${filters.sortOrder || "asc"}`

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search code, name, or Orion Item Code..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <Select
        value={String(filters.activeFilter ?? ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)}
        onValueChange={handleActiveFilterChange}
      >
        <SelectTrigger className="w-[130px]">
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

      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="code-asc">Code (A-Z)</SelectItem>
          <SelectItem value="code-desc">Code (Z-A)</SelectItem>
          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
          <SelectItem value="created_at-desc">Newest First</SelectItem>
          <SelectItem value="created_at-asc">Oldest First</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-10"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
